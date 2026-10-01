// Mushroom Village. Press a finger into the moss and a mushroom pushes up for
// as long as you hold; fit it with a door from the gnomes' tray and one of the
// gnomes waiting at the edge moves in. Draw a finger across the moss and a
// pebble path is laid (stepping stones where it crosses the stream), and the
// gnomes walk it. Pull the sun down and the windows and lanterns glow, the
// chimneys smoke and a snail with a lamp makes its round. Lift the sun and it
// is morning, with the village as it was built.
//
// Nothing is counted, nobody asks for anything, and nothing happens on a clock.

import { TAU, clamp, damp, dist, ease, lerp, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { CLOTH_COLORS, DOOR_COLORS, WOOD_INK, bakeShroom, buildArt, ladderPath, paintFlower, paintPebble, paintShroom, paintStone, shapeOf } from './art.ts'
import type { Shape } from './art.ts'
import { INK, drawSprite, rng, tone } from './kid.ts'
import type { G, Sprite } from './kid.ts'
import { GROUND, KINDS, MAX_SHROOMS, SPOTS, STOCK, STREAM, SUN, TRAY, capAt, depth, dryWalk, inWater, onTray, skyline, slotX, streamAt } from './world.ts'
import type { CapKind, PartKind } from './world.ts'

// ------------------------------------------------------------ what is built

type Side = 1 | -1

interface Door {
  dx: number
  color: number
  open: number
  want: number
  // A door never stands open after whoever opened it has gone.
  until: number
  at: number
}

interface Win {
  on: 'stem' | 'cap'
  u: number
  v: number
  round: boolean
  at: number
}

interface Balcony {
  side: Side
  v: number
  at: number
}

interface Ladder {
  side: Side
  at: number
}

interface Lamp {
  side: Side
  lit: boolean
  swing: Spring
  at: number
}

interface Line {
  side: Side
  to: Shroom | null
  // The hazel pole it is tied to when there is no neighbour.
  px: number
  py: number
  cloths: number[]
  clothAt: number[]
  at: number
}

interface Shroom {
  id: number
  x: number
  y: number
  s: number
  grow: number
  kind: CapKind
  seed: number
  shape: Shape
  spr: Sprite | null
  // Fingers on it: while held it is drawn live.
  held: number
  sq: Spring
  tilt: Spring
  door: Door | null
  wins: Win[]
  chim: { u: number; at: number } | null
  balcs: Balcony[]
  ladders: Ladder[]
  lamps: Lamp[]
  line: Line | null
  owner: Gnome | null
  lit: number
  litOn: boolean
  smoke: number
}

type Fit =
  | { kind: 'door'; dx: number }
  | { kind: 'window'; on: 'stem' | 'cap'; u: number; v: number }
  | { kind: 'chimney'; u: number }
  | { kind: 'balcony'; side: Side; v: number }
  | { kind: 'ladder'; side: Side }
  | { kind: 'lantern'; side: Side }
  | { kind: 'line'; side: Side; to: Shroom | null; px: number; py: number }

// A part that is not on a mushroom: in the hand, lying on the moss, or on
// its way back to the tray.
interface Item {
  kind: PartKind
  variant: number
  x: number
  y: number
  rot: number
}

// ------------------------------------------------------------ the folk

type Pose = 'stand' | 'sweep' | 'reach' | 'knock' | 'look' | 'sit' | 'sleep' | 'climb'

type Step = { k: 'walk'; x: number; y: number } | { k: 'wait'; t: number; pose: Pose } | { k: 'do'; fn: () => void } | { k: 'climb'; to: number }

interface RoutePoint {
  x: number
  y: number
  // A stepping stone: hop.
  w: boolean
}

interface Gnome {
  id: number
  x: number
  y: number
  face: Side
  home: Shroom | null
  mode: 'ground' | 'in' | 'balcony' | 'ladder' | 'window'
  perch: Side
  lad: number
  plan: Step[]
  pose: Pose
  route: RoutePoint[] | null
  ri: number
  walk: number
  moving: boolean
  hop: number
  bundle: boolean
  spot: number
  waiting: boolean
  want: PartKind | 'stroll' | null
  strollX: number
  strollY: number
  last: string
  shy: Spring
  nightDone: boolean
  swish: number
  // Walks in a row that had no way through.
  lost: number
}

interface PathNode {
  x: number
  y: number
  water: boolean
  adj: number[]
  seed: number
}

type Hold =
  | { k: 'sun'; oy: number }
  | { k: 'part'; item: Item; fit: Fit | null; target: Shroom | null }
  | { k: 'grow'; m: Shroom; fresh: boolean; g0: number; t0: number; step: number; sx: number; sy: number }
  | { k: 'path'; lx: number; ly: number; prev: number; first: number; laid: number; flower: boolean }
  // A finger resting on a fitted part: it comes off if pulled.
  | { k: 'pull'; pull: Pull }
  | { k: 'none' }

interface Pull {
  m: Shroom
  kind: Exclude<PartKind, 'door'>
  i: number
}

const MAX_NODES = 760
const GNOME = 1.05

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const S = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1))
  const art = buildArt(1 + Math.floor(stage.rand() * 90000), S)

  let time = 0
  let lastTouch = -3
  let nextId = 1
  const shrooms: Shroom[] = []
  const gnomes: Gnome[] = []
  const nodes: PathNode[] = []
  const fresh: { i: number; at: number }[] = []
  const loose: Item[] = []
  const returning: { item: Item; fromX: number; fromY: number; t: number; slot: number }[] = []
  const holds = new Map<number, Hold>()
  const stock: Record<PartKind, number> = { ...STOCK }
  const rise = KINDS.map(() => 1)
  const ripples: { x: number; y: number; t: number }[] = []
  const puffs: { x: number; y: number; r: number; vx: number; life: number }[] = []
  const glows: number[] = []
  const squiggles = Array.from({ length: 9 }, (_, i) => ({ u: (i / 9) * (STREAM.length - 1), off: (stage.rand() * 2 - 1) * 0.55, len: 9 + stage.rand() * 8 }))
  const flies = Array.from({ length: 9 }, () => ({ x: 80 + stage.rand() * (W - 160), y: 380 + stage.rand() * 260, p: stage.rand() * TAU }))
  const ferns = [
    { x: 44, y: 584, s: 0.62, i: 0 },
    { x: 128, y: 570, s: 0.7, i: 1 },
    { x: 196, y: 596, s: 0.58, i: 2 },
    { x: 52, y: 676, s: 0.5, i: 1 },
    { x: 1046, y: 368, s: 0.6, i: 2 },
    { x: 1120, y: 362, s: 0.66, i: 0 },
    { x: 1164, y: 404, s: 0.56, i: 1 },
    { x: 418, y: 362, s: 0.56, i: 0 },
    { x: 498, y: 358, s: 0.62, i: 2 },
    { x: 548, y: 374, s: 0.5, i: 1 },
  ]
  let reserve = MAX_SHROOMS - SPOTS.length
  const spotFreeAt: number[] = SPOTS.map(() => -1)
  let assignAt = 0

  // The sun and the dusk it draws down.
  let sunY = SUN.up
  let sunGoal = SUN.up
  let sunHeld = false
  let night = 0
  let isNight = false
  let cricketAt = 0
  let burbleAt = 4
  let ghost: { m: Shroom; fit: Fit; variant: number } | null = null

  const snail = { on: false, x: W + 70, y: 664, face: -1 as Side, tx: 0, ty: 0, node: -1, prev: -1, leaving: false, leg: 0 }

  // ---------------------------------------------------------------- sound

  const earth = () => {
    sfx.tone({ freq: 190, to: 400, dur: 0.09, type: 'sine', vol: 0.13 })
    sfx.noise({ dur: 0.07, freq: 500, vol: 0.05, filter: 'lowpass' })
  }
  const growNote = (step: number) => sfx.tone({ freq: sfx.scale(step - 9), dur: 0.3, type: 'sine', vol: 0.085, attack: 0.012 })
  const settle = () => {
    sfx.tone({ freq: sfx.scale(-5), dur: 0.7, type: 'sine', vol: 0.07, attack: 0.02 })
    sfx.tone({ freq: sfx.scale(-2), dur: 0.8, type: 'sine', vol: 0.06, delay: 0.09, attack: 0.02 })
  }
  const pat = () => sfx.tone({ freq: 150, to: 95, dur: 0.1, type: 'sine', vol: 0.1 })
  const wood = (f = 520, vol = 0.1) => {
    sfx.tone({ freq: f, to: f * 0.72, dur: 0.06, type: 'triangle', vol })
    sfx.noise({ dur: 0.03, freq: f * 3, vol: vol * 0.4, q: 2 })
  }
  // A fast finger lays many pebbles at once; they do not all click.
  let clickAt = -1
  const pebble = () => {
    if (time - clickAt < 0.045) return
    clickAt = time
    sfx.noise({ dur: 0.035, freq: 1900 + Math.random() * 1500, vol: 0.085, q: 4 })
  }
  let plopAt = -1
  const plop = () => {
    if (time - plopAt < 0.08) return
    plopAt = time
    sfx.tone({ freq: 440, to: 150, dur: 0.12, type: 'sine', vol: 0.11 })
    sfx.noise({ dur: 0.09, freq: 800, vol: 0.04, filter: 'lowpass' })
  }
  const rustle = () => sfx.noise({ dur: 0.26, freq: 3200, to: 1700, vol: 0.04, q: 0.7 })
  const drip = (delay = 0) => sfx.tone({ freq: 1250 + Math.random() * 300, to: 880, dur: 0.05, type: 'sine', vol: 0.035, delay })
  const ting = () => sfx.tone({ freq: 1568, dur: 0.55, type: 'sine', vol: 0.06, attack: 0.004 })
  const chime = (step: number) => {
    sfx.tone({ freq: sfx.scale(step - 5), dur: 0.7, type: 'sine', vol: 0.09, attack: 0.01 })
    sfx.tone({ freq: sfx.scale(step - 2), dur: 0.8, type: 'sine', vol: 0.05, delay: 0.12, attack: 0.01 })
  }

  const drops = (x: number, y: number, count = 5, spread = 40) => {
    for (let i = 0; i < count; i++) fx.burst(x + (Math.random() * 2 - 1) * spread, y, { count: 1, color: ['#bfe6ff', '#ffffff', '#8fd2f5'], speed: 90, angle: -Math.PI / 2, spread: 1.6, gravity: 620, life: 0.55, size: 5 })
  }
  const crumbs = (x: number, y: number) => fx.burst(x, y, { count: 7, color: ['#2e8b3c', '#7fc650', '#8a5a34'], speed: 150, angle: -Math.PI / 2, spread: 2.2, gravity: 700, life: 0.45, size: 5 })

  // ---------------------------------------------------------------- mushroom geometry
  // All in the mushroom's own units: origin at the foot of the stem, y up is
  // negative, one unit is `m.s` pixels.

  const partScale = (m: Shroom) => lerp(1.02, 1.36, m.grow)
  const doorScale = (m: Shroom) => Math.min(lerp(1.15, 1.5, m.grow), (m.shape.stemH + 6) / 46)
  const pop = (at: number) => ease.outBack(clamp((time - at) / 0.32, 0, 1))
  const wx = (m: Shroom, ux: number) => m.x + ux * m.s
  const wy = (m: Shroom, uy: number) => m.y + uy * m.s

  const stemWinRange = (m: Shroom): [number, number] => [46 * doorScale(m) + 15, m.shape.stemH - 15]

  const winPos = (m: Shroom, w: { on: 'stem' | 'cap'; u: number; v: number }): [number, number] => {
    const sh = m.shape
    if (w.on === 'stem') {
      const [lo, hi] = stemWinRange(m)
      return [w.u * Math.max(0, sh.sw - 13), -lerp(lo, Math.max(lo, hi), w.v)]
    }
    const k = 0.2 + 0.4 * w.v
    return [w.u * sh.rx * 0.62 * Math.sqrt(1 - (k + 0.12) ** 2), -(sh.stemH + sh.capH * k)]
  }

  const chimPos = (m: Shroom, u: number): [number, number] => [u * m.shape.rx * 0.9, -(m.shape.stemH + m.shape.capH * Math.sqrt(1 - u * u) * 0.94) + 6]

  const balcY = (m: Shroom, v: number): number => {
    const lo = Math.min(30, m.shape.stemH * 0.42)
    const hi = Math.max(lo, m.shape.stemH - 58)
    return -lerp(lo, hi, v)
  }

  const ladderEnds = (m: Shroom, side: Side): [number, number, number, number] => {
    const sh = m.shape
    const b = m.balcs.find((x) => x.side === side)
    const tx = b ? side * (sh.sw * 0.92 + 38 * partScale(m)) : side * sh.rx * 0.8
    const ty = b ? balcY(m, b.v) - 3 : -(sh.stemH - 3)
    return [tx + side * 20, 2, tx, ty]
  }

  const lampHook = (m: Shroom, side: Side): [number, number] => [side * m.shape.rx * 0.84, -m.shape.stemH + 5]

  const tie = (m: Shroom, side: Side): [number, number] => [side * m.shape.sw * 0.8, -Math.min(m.shape.stemH - 5, 72)]

  const lineEnds = (m: Shroom, l: { side: Side; to: Shroom | null; px: number; py: number }): [number, number, number, number] => {
    const a = tie(m, l.side)
    if (l.to) {
      const b = tie(l.to, -l.side as Side)
      return [wx(m, a[0]), wy(m, a[1]), wx(l.to, b[0]), wy(l.to, b[1])]
    }
    return [wx(m, a[0]), wy(m, a[1]), l.px, l.py - 76 * depth(l.py)]
  }

  const linePoint = (e: [number, number, number, number], t: number): [number, number] => {
    const sag = 8 + Math.hypot(e[2] - e[0], e[3] - e[1]) * 0.07
    const u = 1 - t
    return [u * u * e[0] + 2 * u * t * ((e[0] + e[2]) / 2) + t * t * e[2], u * u * e[1] + 2 * u * t * ((e[1] + e[3]) / 2 + sag) + t * t * e[3]]
  }

  const doorstep = (m: Shroom): [number, number] => [wx(m, m.door ? m.door.dx : 0), m.y + 5]

  const bake = (m: Shroom) => {
    m.spr = bakeShroom(m.shape, m.kind, m.seed, m.grow, S * m.s)
  }

  const blocked = (x: number, y: number) => x < 250 && y < 472

  const canGrowAt = (x: number, y: number): boolean => {
    if (x < 46 || x > W - 46 || blocked(x, y)) return false
    const h = streamAt(x, y)
    if (h.d < h.hw + 24) return false
    const s = depth(y)
    for (const m of shrooms) if (Math.abs(m.x - x) < 78 * s && Math.abs(m.y - y) < 30) return false
    return true
  }

  const shroomAt = (x: number, y: number): Shroom | null => {
    let best: Shroom | null = null
    for (const m of shrooms) {
      const lx = (x - m.x) / m.s
      const ly = (y - m.y) / m.s
      const sh = m.shape
      if (ly > 16 || ly < -(sh.stemH + sh.capH + 10)) continue
      if (Math.abs(lx) > (ly > -sh.stemH + 6 ? sh.sw + 14 : sh.rx + 10)) continue
      if (!best || m.y > best.y) best = m
    }
    return best
  }

  // ---------------------------------------------------------------- fitting a part

  const fitFor = (m: Shroom, kind: PartKind, x: number, y: number): Fit | null => {
    const sh = m.shape
    const lx = (x - m.x) / m.s
    const ly = (y - m.y) / m.s
    const side: Side = lx >= 0 ? 1 : -1
    const free = (list: { side: Side }[]): Side | null => (list.some((p) => p.side === side) ? (list.some((p) => p.side === -side) ? null : (-side as Side)) : side)
    if (kind === 'door') {
      if (m.door) return null
      const room = Math.max(0, sh.sw - 15 * doorScale(m) - 1)
      return { kind, dx: clamp(lx, -room, room) }
    }
    if (kind === 'window') {
      if (m.wins.length >= (m.grow > 0.5 ? 4 : 2)) return null
      const clear = (f: { on: 'stem' | 'cap'; u: number; v: number }) => {
        const p = winPos(m, f)
        return m.wins.every((w) => {
          const q = winPos(m, w)
          return Math.hypot(q[0] - p[0], q[1] - p[1]) > 22 * partScale(m)
        })
      }
      const [lo, hi] = stemWinRange(m)
      const onCap: Fit & { kind: 'window' } = { kind, on: 'cap', u: 0, v: clamp((-ly - sh.stemH - sh.capH * 0.2) / (sh.capH * 0.4), 0, 1) }
      onCap.u = clamp(lx / (sh.rx * 0.62 * Math.sqrt(1 - (0.32 + 0.4 * onCap.v) ** 2)), -1, 1)
      const onStem: (Fit & { kind: 'window' }) | null = hi > lo ? { kind, on: 'stem', u: clamp(lx / Math.max(1, sh.sw - 13), -1, 1), v: clamp((-ly - lo) / (hi - lo), 0, 1) } : null
      const order = onStem && -ly < sh.stemH ? [onStem, onCap] : [onCap, onStem]
      for (const f of order) if (f && clear(f)) return f
      // The spot is taken: try the other side of the cap.
      const flipped = { ...onCap, u: -onCap.u }
      return clear(flipped) ? flipped : null
    }
    if (kind === 'chimney') return m.chim ? null : { kind, u: clamp(lx / (sh.rx * 0.9), -0.62, 0.62) }
    if (kind === 'balcony') {
      const s = free(m.balcs)
      if (!s) return null
      const lo = Math.min(30, sh.stemH * 0.42)
      const hi = Math.max(lo, sh.stemH - 58)
      return { kind, side: s, v: hi > lo ? clamp((-ly - lo) / (hi - lo), 0, 1) : 0 }
    }
    if (kind === 'ladder') {
      const s = free(m.ladders)
      return s ? { kind, side: s } : null
    }
    if (kind === 'lantern') {
      const s = free(m.lamps)
      return s ? { kind, side: s } : null
    }
    if (m.line) return null
    // A washing line goes to the nearest neighbour on that side, or to a pole
    // of its own.
    for (const s of [side, -side as Side]) {
      let to: Shroom | null = null
      let near = 340
      for (const o of shrooms) {
        if (o === m) continue
        const dx = (o.x - m.x) * s
        if (dx < 100 || Math.abs(o.y - m.y) > 110) continue
        const d = Math.hypot(o.x - m.x, o.y - m.y)
        if (d < near) {
          near = d
          to = o
        }
      }
      if (to) return { kind: 'line', side: s, to, px: 0, py: 0 }
      for (const reach of [150, 112]) {
        const px = m.x + s * reach * m.s
        if (px > 40 && px < W - 40 && !inWater(px, m.y) && !blocked(px, m.y)) return { kind: 'line', side: s, to: null, px, py: m.y + 2 }
      }
    }
    return null
  }

  const findFit = (kind: PartKind, x: number, y: number): { m: Shroom; fit: Fit } | null => {
    let best: { m: Shroom; fit: Fit } | null = null
    let near = Infinity
    for (const m of shrooms) {
      const sh = m.shape
      const lx = (x - m.x) / m.s
      const ly = (y - m.y) / m.s
      if (Math.abs(lx) > Math.max(sh.rx, sh.sw + 50) + 46 || ly > 50 || ly < -(sh.stemH + sh.capH + 54)) continue
      // Distance to the mushroom's middle line.
      const d = Math.hypot(lx, ly - clamp(ly, -(sh.stemH + sh.capH), 0)) * m.s
      if (d >= near) continue
      const fit = fitFor(m, kind, x, y)
      if (!fit) continue
      near = d
      best = { m, fit }
    }
    return best
  }

  const attach = (m: Shroom, fit: Fit, variant: number) => {
    const at = time
    let px = m.x
    let py = m.y - m.shape.stemH * 0.5 * m.s
    if (fit.kind === 'door') {
      m.door = { dx: fit.dx, color: variant % DOOR_COLORS.length, open: 0, want: 0, until: 0, at }
      wood(430, 0.11)
      stage.after(0.09, () => wood(380, 0.09))
      py = m.y - 20
    } else if (fit.kind === 'window') {
      m.wins.push({ on: fit.on, u: fit.u, v: fit.v, round: variant % 2 === 0, at })
      wood(700, 0.07)
      sfx.tone({ freq: 2100, dur: 0.12, type: 'sine', vol: 0.035, delay: 0.03 })
      const p = winPos(m, fit)
      px = wx(m, p[0])
      py = wy(m, p[1])
    } else if (fit.kind === 'chimney') {
      m.chim = { u: fit.u, at }
      wood(300, 0.12)
      const p = chimPos(m, fit.u)
      px = wx(m, p[0])
      py = wy(m, p[1])
    } else if (fit.kind === 'balcony') {
      m.balcs.push({ side: fit.side, v: fit.v, at })
      wood(480, 0.1)
      stage.after(0.1, () => wood(560, 0.08))
    } else if (fit.kind === 'ladder') {
      m.ladders.push({ side: fit.side, at })
      wood(620, 0.08)
      stage.after(0.08, () => wood(700, 0.07))
      stage.after(0.16, () => wood(780, 0.06))
    } else if (fit.kind === 'lantern') {
      const sw = spring(0, 30, 2.2)
      sw.kick(3 * fit.side)
      m.lamps.push({ side: fit.side, lit: false, swing: sw, at })
      ting()
    } else {
      m.line = { side: fit.side, to: fit.to, px: fit.px, py: fit.py, cloths: [], clothAt: [], at }
      sfx.tone({ freq: 330, to: 300, dur: 0.3, type: 'triangle', vol: 0.08 })
    }
    m.sq.kick(-1.6)
    drops(px, py, 4, 26)
    // Whoever lives here will use it next.
    const gn = m.owner
    if (gn && gn.home === m) {
      gn.want = fit.kind
      gn.nightDone = false
      if (interruptible(gn)) replan(gn, [])
    }
  }

  // The fitted part under a finger, if any. Doors stay: someone lives behind them.
  const partAt = (x: number, y: number): Pull | null => {
    const byFront = [...shrooms].sort((a, b) => b.y - a.y)
    for (const m of byFront) {
      const sh = m.shape
      const lx = (x - m.x) / m.s
      const ly = (y - m.y) / m.s
      const ps = partScale(m)
      const pad = 7 / m.s
      for (let i = m.lamps.length - 1; i >= 0; i--) {
        const h = lampHook(m, m.lamps[i]!.side)
        if (Math.hypot(lx - h[0], ly - (h[1] + 20 * ps)) < 17 * ps + pad) return { m, kind: 'lantern', i }
      }
      for (let i = m.wins.length - 1; i >= 0; i--) {
        const q = winPos(m, m.wins[i]!)
        if (Math.hypot(lx - q[0], ly - q[1]) < 14 * ps + pad) return { m, kind: 'window', i }
      }
      for (let i = m.balcs.length - 1; i >= 0; i--) {
        const b = m.balcs[i]!
        const cx = b.side * (sh.sw * 0.92 + 22 * ps)
        if (Math.abs(lx - cx) < 25 * ps && Math.abs(ly - (balcY(m, b.v) - 7 * ps)) < 15 * ps + pad) return { m, kind: 'balcony', i }
      }
      for (let i = m.ladders.length - 1; i >= 0; i--) {
        const e = ladderEnds(m, m.ladders[i]!.side)
        const len2 = (e[2] - e[0]) ** 2 + (e[3] - e[1]) ** 2 || 1
        const t = clamp(((lx - e[0]) * (e[2] - e[0]) + (ly - e[1]) * (e[3] - e[1])) / len2, 0, 1)
        if (Math.hypot(lx - lerp(e[0], e[2], t), ly - lerp(e[1], e[3], t)) < 10 * ps + pad) return { m, kind: 'ladder', i }
      }
      if (m.chim) {
        const q = chimPos(m, m.chim.u)
        if (Math.abs(lx - q[0]) < 14 * ps + pad && ly > q[1] - 44 * ps - pad && ly < q[1] - 8) return { m, kind: 'chimney', i: 0 }
      }
      if (m.line) {
        const l = m.line
        const e = lineEnds(m, l)
        if (!l.to && Math.abs(x - l.px) < 18 && y < l.py + 8 && y > l.py - 86 * depth(l.py)) return { m, kind: 'line', i: 0 }
        for (const t of [0.3, 0.45, 0.6, 0.75, 0.9]) {
          const q = linePoint(e, t)
          if (Math.hypot(x - q[0], y - (q[1] + 8)) < 17) return { m, kind: 'line', i: 0 }
        }
      }
    }
    return null
  }

  // A touched part answers in its own way.
  const nudge = (pl: Pull) => {
    const m = pl.m
    if (pl.kind === 'lantern') {
      m.lamps[pl.i]!.swing.kick(4 * m.lamps[pl.i]!.side)
      ting()
    } else if (pl.kind === 'window') {
      m.wins[pl.i]!.at = time - 0.14
      wood(700, 0.06)
    } else if (pl.kind === 'balcony') {
      m.balcs[pl.i]!.at = time - 0.14
      wood(480, 0.08)
    } else if (pl.kind === 'ladder') {
      m.ladders[pl.i]!.at = time - 0.14
      wood(620, 0.07)
    } else if (pl.kind === 'chimney') {
      const q = chimPos(m, m.chim!.u)
      puffs.push({ x: wx(m, q[0]), y: wy(m, q[1] - 44 * partScale(m)), r: 5 * m.s, vx: rand(-4, 8), life: 1 })
      wood(300, 0.09)
    } else {
      const l = m.line!
      for (let i = 0; i < l.clothAt.length; i++) l.clothAt[i] = time - 0.16
      sfx.tone({ freq: 330, to: 300, dur: 0.3, type: 'triangle', vol: 0.07 })
    }
  }

  // Pulled off again: the part is back in the hand, and whoever was using it
  // is quietly at home.
  const detach = (pl: Pull): Item => {
    const m = pl.m
    let variant = 0
    if (pl.kind === 'lantern') m.lamps.splice(pl.i, 1)
    else if (pl.kind === 'window') variant = m.wins.splice(pl.i, 1)[0]!.round ? 0 : 1
    else if (pl.kind === 'balcony') m.balcs.splice(pl.i, 1)
    else if (pl.kind === 'ladder') m.ladders.splice(pl.i, 1)
    else if (pl.kind === 'chimney') m.chim = null
    else m.line = null
    const gn = m.owner
    if (gn && gn.home === m && !gn.bundle) {
      if (gn.mode === 'ladder') {
        gn.mode = 'ground'
        gn.x = m.x + (m.shape.sw + 30) * m.s * gn.perch
        gn.y = m.y + 4
        if (inWater(gn.x, gn.y)) gn.mode = 'in'
      } else if (gn.mode === 'balcony' || gn.mode === 'window') gn.mode = 'in'
      if (gn.mode === 'in' || dist(gn.x, gn.y, m.x, m.y) < 200) {
        gn.nightDone = false
        gn.want = null
        replan(gn, [WAIT(0.8)])
      }
    }
    m.sq.kick(1.2)
    wood(820, 0.07)
    return { kind: pl.kind, variant, x: 0, y: 0, rot: 0 }
  }

  // ---------------------------------------------------------------- pebble paths

  const addNode = (x: number, y: number, prev: number): number => {
    const i = nodes.length
    nodes.push({ x, y, water: inWater(x, y), adj: [], seed: 1 + Math.floor(Math.random() * 1e6) })
    if (prev >= 0) {
      nodes[prev]!.adj.push(i)
      nodes[i]!.adj.push(prev)
    }
    fresh.push({ i, at: time })
    if (nodes[i]!.water) {
      plop()
      ripples.push({ x, y, t: 0 })
    } else pebble()
    return i
  }

  const layable = (x: number, y: number) => x > 18 && x < W - 18 && y > skyline(x) + 36 && y < 678 && !onTray(x, y, 6) && !blocked(x, y - 14)

  const lay = (h: Hold & { k: 'path' }, x: number, y: number) => {
    for (let guard = 0; guard < 40; guard++) {
      const d = dist(h.lx, h.ly, x, y)
      if (d < 25 || nodes.length >= MAX_NODES) return
      h.lx += ((x - h.lx) / d) * 25
      h.ly += ((y - h.ly) / d) * 25
      if (layable(h.lx, h.ly)) {
        h.prev = addNode(h.lx, h.ly, h.prev)
        h.laid++
      } else h.prev = -1
    }
  }

  const finishPath = (first: number) => {
    // Join it to any path it touches.
    for (let i = first; i < nodes.length; i++) {
      const a = nodes[i]!
      for (let j = 0; j < first; j++) {
        const b = nodes[j]!
        if (Math.abs(a.x - b.x) < 36 && Math.abs(a.y - b.y) < 36 && dist(a.x, a.y, b.x, b.y) < 36 && !a.adj.includes(j)) {
          a.adj.push(j)
          b.adj.push(i)
        }
      }
    }
    if (nodes.length - first < 3 || isNight) return
    // The nearest gnomes at home come and try it.
    const a = nodes[first]!
    const b = nodes[nodes.length - 1]!
    const mid = nodes[Math.floor((first + nodes.length - 1) / 2)]!
    let sent = 0
    const near = gnomes.filter((g) => g.home && !g.waiting && interruptible(g)).sort((p, q) => dist(p.x, p.y, mid.x, mid.y) - dist(q.x, q.y, mid.x, mid.y))
    for (const gn of near) {
      if (sent >= 2) break
      const [hx, hy] = doorstep(gn.home!)
      const far = dist(hx, hy, a.x, a.y) > dist(hx, hy, b.x, b.y) ? a : b
      const end = far.water ? mid : far
      if (end.water || !route(hx, hy, end.x, end.y)) continue
      gn.want = 'stroll'
      gn.strollX = end.x
      gn.strollY = end.y
      replan(gn, [])
      sent++
    }
  }

  // Ways across the glade: along the pebbles where they help, straight over
  // the moss where they do not, and never through the water. `spread` finds
  // how far every pebble is from one place; `reach` reads a way off it.
  const OFF = 2.2
  interface Field {
    ax: number
    ay: number
    d: Float32Array
    prev: Int32Array
  }
  const heapK: number[] = []
  const heapV: number[] = []
  const heapPush = (k: number, v: number) => {
    let i = heapK.length
    heapK.push(k)
    heapV.push(v)
    while (i > 0) {
      const up = (i - 1) >> 1
      if (heapK[up]! <= k) break
      heapK[i] = heapK[up]!
      heapV[i] = heapV[up]!
      i = up
    }
    heapK[i] = k
    heapV[i] = v
  }
  const heapPop = (): number => {
    const top = heapV[0]!
    const k = heapK.pop()!
    const v = heapV.pop()!
    const n = heapK.length
    if (n > 0) {
      let i = 0
      for (;;) {
        let c = 2 * i + 1
        if (c >= n) break
        if (c + 1 < n && heapK[c + 1]! < heapK[c]!) c++
        if (heapK[c]! >= k) break
        heapK[i] = heapK[c]!
        heapV[i] = heapV[c]!
        i = c
      }
      heapK[i] = k
      heapV[i] = v
    }
    return top
  }

  const spread = (ax: number, ay: number): Field => {
    const n = nodes.length
    const d = new Float32Array(n).fill(Infinity)
    const prev = new Int32Array(n).fill(-1)
    // Someone standing on a stepping stone starts from that stone.
    const wet = inWater(ax, ay)
    heapK.length = 0
    heapV.length = 0
    for (let i = 0; i < n; i++) {
      const nd = nodes[i]!
      const da = dist(ax, ay, nd.x, nd.y)
      if (wet ? da < 50 : !nd.water && da < 150 && dryWalk(ax, ay, nd.x, nd.y)) {
        d[i] = da * OFF
        heapPush(d[i]!, i)
      }
    }
    while (heapK.length) {
      const key = heapK[0]!
      const u = heapPop()
      if (key > d[u]!) continue
      const nu = nodes[u]!
      for (const v of nu.adj) {
        const nv = nodes[v]!
        const w = d[u]! + dist(nu.x, nu.y, nv.x, nv.y)
        if (w < d[v]!) {
          d[v] = w
          prev[v] = u
          heapPush(w, v)
        }
      }
    }
    return { ax, ay, d, prev }
  }

  const reach = (f: Field, bx: number, by: number): { pts: RoutePoint[]; cost: number; paved: number } | null => {
    let best = dryWalk(f.ax, f.ay, bx, by) ? dist(f.ax, f.ay, bx, by) * OFF : Infinity
    let exit = -1
    for (let i = 0; i < f.d.length; i++) {
      const nd = nodes[i]!
      if (nd.water || f.d[i] === Infinity) continue
      const db = dist(nd.x, nd.y, bx, by)
      if (db < 150 && f.d[i]! + db * OFF < best && dryWalk(nd.x, nd.y, bx, by)) {
        best = f.d[i]! + db * OFF
        exit = i
      }
    }
    if (best === Infinity) return null
    const pts: RoutePoint[] = [{ x: bx, y: by, w: false }]
    let paved = 0
    for (let i = exit; i >= 0; i = f.prev[i]!) {
      const nd = nodes[i]!
      pts.push({ x: nd.x, y: nd.y - 2, w: nd.water })
      paved++
    }
    pts.reverse()
    return { pts, cost: best, paved }
  }

  const route = (ax: number, ay: number, bx: number, by: number) => reach(spread(ax, ay), bx, by)

  // ---------------------------------------------------------------- the gnomes

  const WAIT = (t: number, pose: Pose = 'stand'): Step => ({ k: 'wait', t, pose })
  const DO = (fn: () => void): Step => ({ k: 'do', fn })
  const GO = (x: number, y: number): Step => ({ k: 'walk', x, y })
  const rand = (a: number, b: number) => a + Math.random() * (b - a)

  const replan = (gn: Gnome, steps: Step[]) => {
    gn.plan = steps
    gn.route = null
    gn.moving = false
    gn.pose = 'stand'
    gn.hop = 0
  }

  // A gnome may be called away when it is only standing, sweeping or resting.
  function interruptible(gn: Gnome): boolean {
    if (gn.waiting || gn.bundle) return false
    return gn.plan.every((s) => s.k === 'wait' || s.k === 'walk')
  }

  const openDoor = (m: Shroom) => {
    if (!m.door) return
    m.door.want = 1
    m.door.until = time + 1.3
    sfx.tone({ freq: 270, to: 350, dur: 0.22, type: 'triangle', vol: 0.03 })
  }
  const shutDoor = (m: Shroom) => {
    if (!m.door) return
    m.door.want = 0
    wood(260, 0.04)
  }

  const beside = (m: Shroom, gn: Gnome): [number, number] => {
    const [x, y] = doorstep(m)
    const side = gn.id % 2 ? 1 : -1
    const sx = x + side * 24 * m.s
    return inWater(sx, y + 3) ? [x - side * 24 * m.s, y + 3] : [sx, y + 3]
  }

  const goIn = (gn: Gnome): Step[] => {
    const m = gn.home!
    const [x, y] = doorstep(m)
    return [
      GO(x, y),
      DO(() => openDoor(m)),
      WAIT(0.4),
      DO(() => {
        gn.mode = 'in'
      }),
      WAIT(0.25),
      DO(() => shutDoor(m)),
    ]
  }

  const comeOut = (gn: Gnome): Step[] => {
    const m = gn.home!
    return [
      DO(() => openDoor(m)),
      WAIT(0.4),
      DO(() => {
        const [x, y] = doorstep(m)
        gn.x = x
        gn.y = y
        gn.mode = 'ground'
      }),
      WAIT(0.3),
      DO(() => shutDoor(m)),
    ]
  }

  const offLadder = (gn: Gnome): Step[] => [
    { k: 'climb', to: 0 },
    DO(() => {
      const m = gn.home!
      const e = ladderEnds(m, gn.perch)
      gn.x = wx(m, e[0])
      gn.y = m.y + 4
      gn.mode = 'ground'
    }),
  ]

  const toGround = (gn: Gnome): Step[] => {
    if (gn.mode === 'ground') return []
    if (gn.mode === 'in') return comeOut(gn)
    if (gn.mode === 'ladder') return offLadder(gn)
    return [
      DO(() => {
        gn.mode = 'in'
      }),
      WAIT(0.6),
      ...comeOut(gn),
    ]
  }

  const toInside = (gn: Gnome): Step[] => {
    if (gn.mode === 'in') return []
    if (gn.mode === 'ground') return goIn(gn)
    if (gn.mode === 'ladder') return [...offLadder(gn), ...goIn(gn)]
    return [
      DO(() => {
        gn.mode = 'in'
      }),
      WAIT(0.5),
    ]
  }

  const lightUp = (m: Shroom) => {
    if (m.litOn) return
    m.litOn = true
    chime(m.id % 5)
  }

  const moveIn = (gn: Gnome, m: Shroom) => {
    if (gn.spot >= 0) {
      spotFreeAt[gn.spot] = time + 3
      gn.spot = -1
    }
    gn.waiting = false
    gn.home = m
    m.owner = gn
    replan(gn, [
      ...goIn(gn).slice(0, 3),
      DO(() => {
        gn.mode = 'in'
        gn.bundle = false
      }),
      WAIT(0.3),
      DO(() => shutDoor(m)),
      WAIT(0.7),
      DO(() => lightUp(m)),
      WAIT(2.2),
    ])
  }

  const addCloth = (m: Shroom) => {
    const l = m.line
    if (!l || l.cloths.length >= 4) return
    l.cloths.push((m.id + l.cloths.length * 2 + Math.floor(Math.random() * 2)) % CLOTH_COLORS.length)
    l.clothAt.push(time)
    sfx.noise({ dur: 0.1, freq: 900, to: 1500, vol: 0.035, q: 0.8 })
  }

  const washSpot = (m: Shroom): [number, number] => {
    const l = m.line!
    const e = lineEnds(m, l)
    const x = lerp(e[0], e[2], 0.36)
    const y = lerp(m.y, l.to ? l.to.y : l.py, 0.36) + 5
    if (!inWater(x, y) && dryWalk(m.x, m.y + 5, x, y)) return [x, y]
    return [wx(m, l.side * (m.shape.sw + 26)), m.y + 5]
  }

  const activity = (gn: Gnome, what: string): Step[] | null => {
    const m = gn.home!
    if (what === 'sweep') {
      const [x, y] = beside(m, gn)
      return [...toGround(gn), GO(x, y), WAIT(4.4, 'sweep')]
    }
    if (what === 'balcony' && m.balcs.length) {
      const b = m.balcs[Math.floor(Math.random() * m.balcs.length)]!
      return [
        ...toInside(gn),
        WAIT(0.8),
        DO(() => {
          gn.mode = 'balcony'
          gn.perch = b.side
          wood(520, 0.04)
        }),
        WAIT(rand(9, 14), 'sit'),
      ]
    }
    if (what === 'ladder' && m.ladders.length) {
      const l = m.ladders[Math.floor(Math.random() * m.ladders.length)]!
      const hasBalcony = m.balcs.some((b) => b.side === l.side)
      return [
        ...toGround(gn),
        GO(wx(m, ladderEnds(m, l.side)[0]), m.y + 4),
        DO(() => {
          gn.mode = 'ladder'
          gn.perch = l.side
          gn.lad = 0
        }),
        { k: 'climb', to: 1 },
        ...(hasBalcony
          ? [
              DO(() => {
                gn.mode = 'balcony'
              }),
              WAIT(rand(7, 10), 'sit'),
              DO(() => {
                gn.mode = 'ladder'
                gn.lad = 1
              }),
            ]
          : [WAIT(rand(4, 6), 'look')]),
        ...offLadder(gn),
      ]
    }
    if (what === 'line' && m.line && m.line.cloths.length < 4) {
      const [x, y] = washSpot(m)
      return [...toGround(gn), GO(x, y), WAIT(0.7, 'reach'), DO(() => addCloth(m)), WAIT(0.9, 'reach'), DO(() => addCloth(m)), WAIT(0.5)]
    }
    if (what === 'window' && m.wins.length) {
      return [
        ...toInside(gn),
        WAIT(0.8),
        DO(() => {
          gn.mode = 'window'
        }),
        WAIT(rand(6, 9)),
      ]
    }
    if (what === 'stroll') {
      const [x, y] = beside(m, gn)
      return [...toGround(gn), GO(gn.strollX, gn.strollY), WAIT(2.4, 'look'), GO(x, y)]
    }
    if (what === 'rest') return [...toInside(gn), WAIT(rand(5, 9))]
    if (what === 'idle') return [WAIT(rand(1.6, 3.4))]
    return null
  }

  const visit = (gn: Gnome): Step[] | null => {
    const m = gn.home!
    const [hx, hy] = doorstep(m)
    const options: { o: Shroom; w: number }[] = []
    const from = spread(hx, hy)
    for (const o of shrooms) {
      if (o === m || !o.door) continue
      const [ox, oy] = doorstep(o)
      const rt = reach(from, ox, oy)
      if (!rt) continue
      options.push({ o, w: rt.paved >= 2 ? 5 : dist(hx, hy, ox, oy) < 330 ? 1 : 0.3 })
    }
    if (!options.length) return null
    let pick = Math.random() * options.reduce((a, b) => a + b.w, 0)
    let to = options[0]!.o
    for (const op of options) {
      pick -= op.w
      if (pick <= 0) {
        to = op.o
        break
      }
    }
    const [x, y] = beside(to, gn)
    const [bx, by] = beside(m, gn)
    return [
      ...toGround(gn),
      GO(x, y),
      DO(() => {
        gn.face = to.x > gn.x ? 1 : -1
      }),
      WAIT(0.35, 'knock'),
      DO(() => {
        wood(640, 0.06)
        stage.after(0.16, () => wood(640, 0.05))
        const host = to.owner
        if (host && host.home === to && host.mode === 'in' && interruptible(host) && !isNight) {
          replan(host, [
            ...comeOut(host),
            DO(() => {
              host.face = gn.x > host.x ? 1 : -1
            }),
            WAIT(4.2),
          ])
        }
      }),
      WAIT(0.45, 'knock'),
      WAIT(4.6),
      GO(bx, by),
    ]
  }

  // A walk to somewhere far along the pebbles and back.
  const strollNear = (gn: Gnome): Step[] | null => {
    const [hx, hy] = doorstep(gn.home!)
    const from = spread(hx, hy)
    let far = -1
    for (let tries = 0; tries < 5; tries++) {
      const i = Math.floor(Math.random() * nodes.length)
      const nd = nodes[i]!
      if (nd.water || from.d[i] === Infinity || dist(hx, hy, nd.x, nd.y) < 70) continue
      if (far < 0 || from.d[i]! > from.d[far]!) far = i
    }
    if (far < 0) return null
    gn.strollX = nodes[far]!.x
    gn.strollY = nodes[far]!.y
    return activity(gn, 'stroll')
  }

  const choose = (gn: Gnome) => {
    const m = gn.home
    if (!m) return
    if (isNight) {
      if (gn.nightDone) return
      gn.nightDone = true
      gn.want = null
      const steps: Step[] = []
      const dark = m.lamps.filter((l) => !l.lit)
      if (dark.length) {
        steps.push(...toGround(gn))
        for (const l of dark) {
          const h = lampHook(m, l.side)
          const lx = wx(m, h[0] - l.side * 6)
          const [dx, dy] = doorstep(m)
          // A lamp hanging over the water is lit from the doorstep.
          if (dryWalk(dx, dy, lx, m.y + 5)) steps.push(GO(lx, m.y + 5))
          steps.push(
            DO(() => {
              gn.face = l.side
            }),
            WAIT(0.7, 'reach'),
            DO(() => {
              l.lit = true
              l.swing.kick(1.5)
              ting()
            }),
            WAIT(0.4),
          )
        }
        steps.push(...goIn(gn))
      } else steps.push(...toInside(gn))
      if (m.balcs.length) {
        const b = m.balcs[0]!
        steps.push(
          WAIT(1.4),
          DO(() => {
            gn.mode = 'balcony'
            gn.perch = b.side
          }),
        )
      } else if (m.wins.length) {
        steps.push(
          WAIT(1.2),
          DO(() => {
            gn.mode = 'window'
          }),
        )
      }
      replan(gn, steps)
      return
    }
    let steps: Step[] | null = null
    let what = ''
    if (gn.want) {
      what = gn.want === 'lantern' || gn.want === 'chimney' || gn.want === 'door' ? 'sweep' : gn.want
      gn.want = null
      steps = activity(gn, what)
    }
    for (let tries = 0; !steps && tries < 6; tries++) {
      const bag: [string, number][] = [
        ['sweep', 2],
        ['idle', 1.6],
        ['rest', 2],
        ['visit', 3],
        ['path', nodes.length > 3 ? 2.5 : 0],
        ['balcony', m.balcs.length ? 3 : 0],
        ['ladder', m.ladders.length ? 3 : 0],
        ['line', m.line && m.line.cloths.length < 4 ? 3.5 : 0],
        ['window', m.wins.length ? 1.4 : 0],
      ]
      let pick = Math.random() * bag.reduce((a, b) => a + b[1], 0)
      what = 'idle'
      for (const [name, w] of bag) {
        pick -= w
        if (pick <= 0) {
          what = name
          break
        }
      }
      if (what === gn.last && tries < 4) continue
      steps = what === 'visit' ? visit(gn) : what === 'path' ? strollNear(gn) : activity(gn, what)
    }
    gn.last = what
    // And a pause before the next thing: nobody here is in a hurry.
    replan(gn, steps ? [...steps, WAIT(rand(1.2, 3.6))] : [WAIT(2)])
  }

  const updateGnome = (gn: Gnome, dt: number) => {
    gn.shy.update(dt)
    for (let guard = 0; guard < 6; guard++) {
      const st = gn.plan[0]
      if (!st) {
        if (!gn.waiting) choose(gn)
        if (!gn.plan.length) return
        continue
      }
      if (st.k === 'do') {
        gn.plan.shift()
        st.fn()
        continue
      }
      if (st.k === 'wait') {
        gn.pose = st.pose
        gn.moving = false
        st.t -= dt
        if (st.pose === 'sweep') {
          gn.swish -= dt
          if (gn.swish <= 0) {
            gn.swish = 0.62
            sfx.noise({ dur: 0.2, freq: 2600, to: 3600, vol: 0.022, filter: 'highpass' })
          }
        }
        if (st.t <= 0) {
          gn.plan.shift()
          gn.pose = 'stand'
          continue
        }
        return
      }
      if (st.k === 'climb') {
        gn.pose = 'climb'
        gn.moving = true
        gn.walk += dt * 9
        const dir = Math.sign(st.to - gn.lad)
        gn.lad += dir * dt * 0.42
        if (dir === 0 || (dir > 0 && gn.lad >= st.to) || (dir < 0 && gn.lad <= st.to)) {
          gn.lad = st.to
          gn.moving = false
          gn.pose = 'stand'
          gn.plan.shift()
          continue
        }
        return
      }
      // Walking.
      if (!gn.route) {
        const rt = route(gn.x, gn.y, st.x, st.y)
        if (!rt) {
          // No way there. Think again; a gnome that keeps finding no way is
          // simply at home.
          gn.nightDone = false
          if (gn.home && ++gn.lost >= 2) {
            gn.lost = 0
            gn.mode = 'in'
          }
          replan(gn, [WAIT(1.5)])
          return
        }
        gn.lost = 0
        gn.route = rt.pts
        gn.ri = 0
      }
      const to = gn.route[gn.ri]!
      const d = dist(gn.x, gn.y, to.x, to.y)
      const speed = (gn.bundle ? 44 : 52) * depth(gn.y)
      gn.pose = 'stand'
      if (d <= speed * dt) {
        gn.x = to.x
        gn.y = to.y
        gn.ri++
        if (gn.ri >= gn.route.length) {
          gn.route = null
          gn.moving = false
          gn.hop = 0
          gn.plan.shift()
          continue
        }
        return
      }
      gn.moving = true
      if (Math.abs(to.x - gn.x) > 1) gn.face = to.x > gn.x ? 1 : -1
      gn.x += ((to.x - gn.x) / d) * speed * dt
      gn.y += ((to.y - gn.y) / d) * speed * dt
      gn.walk += dt * 11
      gn.hop = to.w ? Math.abs(Math.sin(gn.walk * 0.5)) * 7 : 0
      return
    }
  }

  const newGnome = (spot: number, walkIn: boolean): Gnome => {
    const sp = SPOTS[spot]!
    const gn: Gnome = {
      id: gnomes.length,
      x: walkIn ? sp.fromX : sp.x,
      y: sp.y,
      face: sp.bank === 1 ? 1 : -1,
      home: null,
      mode: 'ground',
      perch: 1,
      lad: 0,
      plan: [],
      pose: 'stand',
      route: null,
      ri: 0,
      walk: stage.rand() * 6,
      moving: false,
      hop: 0,
      bundle: true,
      spot,
      waiting: !walkIn,
      want: null,
      strollX: 0,
      strollY: 0,
      last: '',
      shy: spring(1, 240, 9),
      nightDone: false,
      swish: 0,
      lost: 0,
    }
    if (walkIn) {
      gn.plan = [
        GO(sp.x, sp.y),
        DO(() => {
          gn.waiting = true
          gn.face = sp.bank === 1 ? 1 : -1
        }),
      ]
    }
    gnomes.push(gn)
    return gn
  }
  for (let i = 0; i < SPOTS.length; i++) newGnome(i, false)

  // Every door without a gnome gets the nearest one that can reach it.
  const assignHomes = () => {
    for (const m of shrooms) {
      if (!m.door || m.owner || time - m.door.at < 0.5) continue
      const [x, y] = doorstep(m)
      const from = spread(x, y)
      let best: Gnome | null = null
      let cost = Infinity
      for (const gn of gnomes) {
        if (!gn.waiting || gn.home) continue
        const rt = reach(from, gn.x, gn.y)
        if (rt && rt.cost < cost) {
          cost = rt.cost
          best = gn
        }
      }
      if (best) moveIn(best, m)
    }
  }

  // ---------------------------------------------------------------- dusk and morning

  const startNight = () => {
    isNight = true
    cricketAt = time + 2
    for (const m of shrooms) if (m.door) m.door.want = 0
    for (const gn of gnomes) {
      gn.nightDone = false
      if (gn.home && !gn.bundle) replan(gn, [WAIT(rand(0.1, 1.6))])
    }
    stage.after(3.5, () => {
      if (!isNight) return
      sfx.tone({ freq: 392, to: 372, dur: 0.34, type: 'sine', vol: 0.05, attack: 0.04 })
      sfx.tone({ freq: 330, to: 318, dur: 0.5, type: 'sine', vol: 0.05, delay: 0.42, attack: 0.04 })
    })
    // The snail sets out.
    snail.on = true
    snail.leaving = false
    snail.node = -1
    snail.prev = -1
    snail.leg = 0
    let start = -1
    for (let i = 0; i < nodes.length; i++) if (!nodes[i]!.water && (start < 0 || nodes[i]!.x > nodes[start]!.x)) start = i
    if (start >= 0 && streamAt(nodes[start]!.x, nodes[start]!.y).bank === 1) {
      snail.x = -70
      snail.y = nodes[start]!.y
    } else {
      snail.x = W + 70
      snail.y = start >= 0 ? clamp(nodes[start]!.y, 380, 668) : 664
    }
    if (start >= 0) {
      snail.node = start
      snail.tx = nodes[start]!.x
      snail.ty = nodes[start]!.y
    } else {
      snail.tx = 1010
      snail.ty = 664
    }
  }

  const startMorning = () => {
    isNight = false
    for (const m of shrooms) {
      for (const l of m.lamps) {
        if (l.lit)
          stage.after(rand(0.3, 1.6), () => {
            if (!isNight) l.lit = false
          })
      }
    }
    for (const gn of gnomes) {
      gn.nightDone = false
      if (gn.home && !gn.bundle) replan(gn, [WAIT(rand(0.6, 3.5))])
    }
    snail.leaving = true
    snail.tx = snail.x < W / 2 && streamAt(snail.x, snail.y).bank === 1 ? -80 : W + 80
    snail.ty = snail.y
    for (let i = 0; i < 3; i++) sfx.tone({ freq: 2000 + i * 260, to: 2500 + i * 200, dur: 0.09, type: 'sine', vol: 0.03, delay: 0.6 + i * 0.13 })
    stage.after(2.2, () => {
      if (isNight) return
      for (let i = 0; i < 2; i++) sfx.tone({ freq: 2600, to: 2100, dur: 0.1, type: 'sine', vol: 0.025, delay: i * 0.16 })
    })
  }

  const SNAIL_ROUND: readonly [number, number][] = [
    [1010, 664],
    [800, 668],
    [640, 660],
    [800, 672],
    [1010, 668],
    [1110, 662],
  ]

  const updateSnail = (dt: number) => {
    if (!snail.on) return
    const d = dist(snail.x, snail.y, snail.tx, snail.ty)
    const step = 11 * dt
    if (d > step) {
      if (Math.abs(snail.tx - snail.x) > 1) snail.face = snail.tx > snail.x ? 1 : -1
      snail.x += ((snail.tx - snail.x) / d) * step
      snail.y += ((snail.ty - snail.y) / d) * step
      return
    }
    if (snail.leaving) {
      snail.on = false
      return
    }
    if (snail.node >= 0 && snail.node < nodes.length) {
      const here = nodes[snail.node]!
      const ways = here.adj.filter((j) => j !== snail.prev)
      const next = ways.length ? ways[Math.floor(Math.random() * ways.length)]! : (here.adj[0] ?? snail.node)
      snail.prev = snail.node
      snail.node = next
      snail.tx = nodes[next]!.x
      snail.ty = nodes[next]!.y
    } else {
      snail.leg = (snail.leg + 1) % SNAIL_ROUND.length
      snail.tx = SNAIL_ROUND[snail.leg]![0]
      snail.ty = SNAIL_ROUND[snail.leg]![1]
    }
  }

  // ---------------------------------------------------------------- drawing

  const ITEM: Record<PartKind, { scale: number; dx: number; dy: number }> = {
    door: { scale: 1.62, dx: 0, dy: 23 },
    window: { scale: 2.05, dx: 0, dy: 0 },
    chimney: { scale: 1.6, dx: 0, dy: 20 },
    balcony: { scale: 1.5, dx: -21, dy: 3 },
    ladder: { scale: 1.16, dx: 0, dy: 0 },
    lantern: { scale: 2.05, dx: 0, dy: -18 },
    line: { scale: 1.1, dx: 0, dy: 0 },
  }

  const itemSprite = (kind: PartKind, variant: number): Sprite => {
    if (kind === 'door') return art.doors[variant % art.doors.length]!
    if (kind === 'window') return art.windows[variant % 2]![0]
    if (kind === 'chimney') return art.chimney
    if (kind === 'balcony') return art.balcony
    if (kind === 'ladder') return art.ladderIcon
    if (kind === 'lantern') return art.lantern[0]
    return art.lineIcon
  }

  const drawItem = (g: G, kind: PartKind, variant: number, x: number, y: number, scale: number, rot: number) => {
    const it = ITEM[kind]
    const k = it.scale * scale
    g.save()
    g.translate(x, y)
    if (rot) g.rotate(rot)
    drawSprite(g, itemSprite(kind, variant), it.dx * k, it.dy * k, night, k, k)
    g.restore()
  }

  const variantOf = (kind: PartKind) => STOCK[kind] - stock[kind]

  const glow = (x: number, y: number, r: number, a: number) => {
    if (night > 0.05) glows.push(x, y, r, a)
  }

  // Assumes the context is at the gnome's feet, scaled to its size, with +x
  // the way it faces.
  const drawGnomeBody = (g: G, gn: Gnome, pose: Pose, moving: boolean) => {
    const frame = (Math.floor(time * 2 + gn.id * 0.4) & 1) as 0 | 1
    const spr = art.gnomes[gn.id % art.gnomes.length]![frame]
    const ph = gn.walk
    const sw = moving && pose !== 'climb' ? Math.sin(ph) * 5.5 : 0
    const bob = moving ? Math.abs(Math.cos(ph)) * 2.2 : 0
    const seated = pose === 'sit' || pose === 'sleep'
    const dark = tone(INK, night)
    if (pose === 'sleep') g.rotate(0.1)
    if (gn.bundle) {
      g.strokeStyle = tone(WOOD_INK, night)
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(11, -25 - bob)
      g.lineTo(-17, -57 - bob)
      g.stroke()
      drawSprite(g, art.bundles[gn.id % art.bundles.length]!, -19, -59 - bob, night)
    }
    // Legs and boots.
    let ax = -5 + sw
    let ay = -1.5 - (moving ? Math.max(0, Math.sin(ph)) * 2.6 : 0)
    let bx = 5 - sw
    let by = -1.5 - (moving ? Math.max(0, -Math.sin(ph)) * 2.6 : 0)
    if (seated) {
      ax = -3.5
      ay = 4
      bx = 5.5
      by = 4
    }
    g.strokeStyle = dark
    g.lineWidth = 3.4
    g.beginPath()
    g.moveTo(-5, -9 - bob)
    g.lineTo(ax, ay)
    g.moveTo(5, -9 - bob)
    g.lineTo(bx, by)
    g.stroke()
    g.strokeStyle = tone('#7a4a26', night)
    g.lineWidth = 5.6
    g.beginPath()
    g.moveTo(ax - 1, ay)
    g.lineTo(ax + 4.5, ay)
    g.moveTo(bx - 1, by)
    g.lineTo(bx + 4.5, by)
    g.stroke()
    drawSprite(g, spr, 0, -bob, night)
    // Arms: the front hand does the work.
    let fx1 = 14 - sw * 0.5
    let fy1 = -18
    let bx1 = -14 + sw * 0.5
    let by1 = -18
    if (gn.bundle) {
      fx1 = 11
      fy1 = -25
    } else if (pose === 'sweep') {
      const bs = Math.sin(time * 6.5) * 6
      g.strokeStyle = tone(WOOD_INK, night)
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(9, -31)
      g.lineTo(20 + bs, -5)
      g.stroke()
      g.strokeStyle = tone('#e0a020', night)
      g.lineWidth = 3
      g.beginPath()
      for (const k of [-4, 0, 4]) {
        g.moveTo(20 + bs, -5)
        g.lineTo(21 + bs + k, 2)
      }
      g.stroke()
      fx1 = 13 + bs * 0.4
      fy1 = -22
      bx1 = 10
      by1 = -29
    } else if (pose === 'reach') {
      fx1 = 15
      fy1 = -57 + Math.sin(time * 5) * 2
    } else if (pose === 'knock') {
      fx1 = 18 + Math.abs(Math.sin(time * 14)) * 3
      fy1 = -36
    } else if (pose === 'look') {
      fx1 = 9
      fy1 = -50
    } else if (pose === 'climb') {
      fx1 = 13
      fy1 = -46 + Math.sin(ph) * 4
      bx1 = -13
      by1 = -46 - Math.sin(ph) * 4
    }
    g.strokeStyle = dark
    g.lineWidth = 3.2
    g.beginPath()
    g.moveTo(8.5, -31 - bob)
    g.lineTo(fx1, fy1 - bob)
    g.moveTo(-8.5, -31 - bob)
    g.lineTo(bx1, by1 - bob)
    g.stroke()
  }

  const drawGnome = (g: G, gn: Gnome) => {
    const s = depth(gn.y) * GNOME
    const asleep = gn.waiting && night > 0.6
    g.save()
    g.translate(gn.x, gn.y - gn.hop + (asleep ? 3 : 0))
    g.scale(s * gn.face, s * gn.shy.value * (gn.moving ? 1 : 1 + Math.sin(time * 1.7 + gn.id * 2.1) * 0.014))
    drawGnomeBody(g, gn, asleep ? 'sleep' : gn.pose, gn.moving)
    g.restore()
  }

  const drawLine = (g: G, m: Shroom, l: { side: Side; to: Shroom | null; px: number; py: number }, cloths: number[] | null, clothAt: number[] | null) => {
    const e = lineEnds(m, l)
    if (!l.to) drawSprite(g, art.pole, l.px, l.py, night, depth(l.py), depth(l.py))
    const mid = linePoint(e, 0.5)
    g.strokeStyle = tone(INK, night)
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(e[0], e[1])
    g.quadraticCurveTo(2 * mid[0] - (e[0] + e[2]) / 2, 2 * mid[1] - (e[1] + e[3]) / 2, e[2], e[3])
    g.stroke()
    if (!cloths || !clothAt) return
    for (let i = 0; i < cloths.length; i++) {
      const p = linePoint(e, 0.2 + i * 0.2)
      const k = m.s * 0.92 * pop(clothAt[i]!)
      drawSprite(g, art.cloths[cloths[i]!]!, p[0], p[1], night, k, k, Math.sin(time * 1.5 + i * 1.7 + m.id) * 0.09)
    }
  }

  const drawLadder = (g: G, m: Shroom, side: Side, k: number) => {
    const e = ladderEnds(m, side)
    ladderPath(g, e[0], e[1], lerp(e[0], e[2], k), lerp(e[1], e[3], k), 8 * partScale(m), rng(m.seed + (side > 0 ? 3 : 7)))
    g.strokeStyle = tone(WOOD_INK, night)
    g.lineWidth = 3.8
    g.stroke()
  }

  const drawBalcony = (g: G, m: Shroom, side: Side, v: number, k: number) => {
    const ps = partScale(m) * k
    drawSprite(g, art.balcony, side * m.shape.sw * 0.92, balcY(m, v), night, ps * side, ps)
  }

  const drawLamp = (g: G, m: Shroom, side: Side, lit: boolean, rot: number, k: number) => {
    const h = lampHook(m, side)
    const ps = partScale(m) * k
    drawSprite(g, art.lantern[lit ? 1 : 0], h[0], h[1], lit ? 0 : night, ps, ps, rot)
    if (lit) glow(wx(m, h[0]), wy(m, h[1] + 22 * ps), 84 * m.s, 0.95)
  }

  const drawWindow = (g: G, m: Shroom, w: { on: 'stem' | 'cap'; u: number; v: number }, round: boolean, k: number) => {
    const p = winPos(m, w)
    const ps = partScale(m) * k
    const lit = m.lit > 0.5
    drawSprite(g, art.windows[round ? 0 : 1]![lit ? 1 : 0], p[0], p[1], lit ? 0 : night, ps, ps)
    if (lit) glow(wx(m, p[0]), wy(m, p[1]), 52 * m.s, 0.8)
  }

  const drawChimney = (g: G, m: Shroom, u: number, k: number) => {
    const p = chimPos(m, u)
    const ps = partScale(m)
    drawSprite(g, art.chimney, p[0], p[1] + (1 - k) * 30, night, ps, ps)
  }

  const drawDoor = (g: G, m: Shroom, dx: number, color: number, open: number, k: number) => {
    const ds = doorScale(m) * k
    if (open > 0.02) drawSprite(g, art.doorway, dx, 0, night, ds, ds)
    const w = 1 - 0.8 * open
    drawSprite(g, art.doors[color]!, dx - 15 * ds * (1 - w), 0, night, ds * w, ds)
    if (m.lit > 0.05 && open < 0.1) {
      g.globalAlpha *= m.lit
      g.fillStyle = '#ffe14a'
      g.beginPath()
      g.arc(dx, -31 * ds, 4.3 * ds, 0, TAU)
      g.fill()
      g.globalAlpha /= m.lit
      glow(wx(m, dx), wy(m, -31 * ds), 36 * m.s, 0.7 * m.lit)
    }
  }

  const drawFit = (g: G, m: Shroom, fit: Fit, variant: number, pre: boolean) => {
    if (pre) {
      if (fit.kind === 'chimney') drawChimney(g, m, fit.u, 1)
      return
    }
    if (fit.kind === 'door') drawDoor(g, m, fit.dx, variant % DOOR_COLORS.length, 0, 1)
    else if (fit.kind === 'window') drawWindow(g, m, fit, variant % 2 === 0, 1)
    else if (fit.kind === 'balcony') drawBalcony(g, m, fit.side, fit.v, 1)
    else if (fit.kind === 'ladder') drawLadder(g, m, fit.side, 1)
    else if (fit.kind === 'lantern') drawLamp(g, m, fit.side, false, 0, 1)
  }

  const drawShroom = (g: G, m: Shroom) => {
    const gh = ghost && ghost.m === m ? ghost : null
    const shimmer = 0.5 + Math.sin(time * 7) * 0.12
    if (m.line) drawLine(g, m, m.line, m.line.cloths, m.line.clothAt)
    if (gh && gh.fit.kind === 'line') {
      g.globalAlpha = shimmer
      drawLine(g, m, gh.fit, null, null)
      g.globalAlpha = 1
    }
    const sy = m.sq.value
    const sx = 1 / Math.sqrt(Math.max(0.3, sy))
    g.save()
    g.translate(m.x, m.y)
    if (Math.abs(m.tilt.value) > 0.001) g.rotate(m.tilt.value)
    g.scale(m.s * sx, m.s * sy)
    if (m.chim) drawChimney(g, m, m.chim.u, pop(m.chim.at))
    if (gh) {
      g.globalAlpha = shimmer
      drawFit(g, m, gh.fit, gh.variant, true)
      g.globalAlpha = 1
    }
    if (m.held > 0 || !m.spr) paintShroom(g, m.shape, m.kind, m.seed, m.grow, night)
    else drawSprite(g, m.spr, 0, 0, night)
    if (m.door) drawDoor(g, m, m.door.dx, m.door.color, m.door.open, pop(m.door.at))
    for (const w of m.wins) drawWindow(g, m, w, w.round, pop(w.at))
    const gn = m.owner
    if (gn && gn.mode === 'window' && m.wins.length) {
      // A face at the first window.
      const p = winPos(m, m.wins[0]!)
      const spr = art.gnomes[gn.id % art.gnomes.length]![0]
      const k = spr.day.width / spr.w
      const size = 12.5 * partScale(m)
      g.drawImage(spr.day, (spr.ax - 11) * k, (spr.ay - 55) * k, 22 * k, 22 * k, p[0] - size / 2, p[1] - size / 2, size, size)
    }
    for (const b of m.balcs) {
      if (gn && gn.mode === 'balcony' && gn.perch === b.side) {
        g.save()
        g.translate(b.side * (m.shape.sw * 0.92 + 23 * partScale(m)), balcY(m, b.v) - 1)
        g.scale(GNOME * 0.9 * b.side, GNOME * 0.9)
        drawGnomeBody(g, gn, 'sit', false)
        g.restore()
      }
      drawBalcony(g, m, b.side, b.v, pop(b.at))
    }
    for (const l of m.lamps) drawLamp(g, m, l.side, l.lit && night > 0.3, l.swing.value * 0.16 + Math.sin(time * 1.1 + m.id) * 0.03, pop(l.at))
    for (const l of m.ladders) {
      drawLadder(g, m, l.side, pop(l.at))
      if (gn && gn.mode === 'ladder' && gn.perch === l.side) {
        const e = ladderEnds(m, l.side)
        g.save()
        g.translate(lerp(e[0], e[2], gn.lad) - l.side * 4, lerp(e[1], e[3], gn.lad * 0.86))
        g.scale(-GNOME * 0.9 * l.side, GNOME * 0.9)
        drawGnomeBody(g, gn, gn.pose === 'look' ? 'look' : 'climb', gn.moving)
        g.restore()
      }
    }
    if (gh) {
      g.globalAlpha = shimmer
      drawFit(g, m, gh.fit, gh.variant, false)
      g.globalAlpha = 1
    }
    g.restore()
  }

  const drawSnail = (g: G) => {
    const s = depth(snail.y) * 0.95
    const stretch = 1 + Math.sin(time * 2.2) * 0.05
    drawSprite(g, art.snail, snail.x, snail.y, night, s * snail.face * stretch, s / stretch)
    const lx = snail.x + snail.face * 15 * s
    const ly = snail.y - 61 * s
    drawSprite(g, art.lantern[1], lx, ly, 0, s * 0.9, s * 0.9, Math.sin(time * 1.6) * 0.1)
    glow(lx, ly + 20 * s, 96, 1)
  }

  interface Ent {
    y: number
    kind: 0 | 1 | 2 | 3 | 4
    i: number
  }
  const order: Ent[] = []

  // ---------------------------------------------------------------- the game

  return {
    update(dt) {
      time = stage.time

      // The sun settles to wherever it was let go nearest.
      if (!sunHeld) sunY = damp(sunY, sunGoal, 3.2, dt)
      const k = clamp((sunY - 138) / (SUN.down - 24 - 138), 0, 1)
      night = k * k * (3 - 2 * k)
      if (!isNight && night > 0.62) startNight()
      else if (isNight && night < 0.38) startMorning()

      // Growing under a finger.
      for (const h of holds.values()) {
        if (h.k !== 'grow') continue
        const m = h.m
        if (m.grow >= 1) continue
        const el = time - h.t0
        m.grow = Math.min(1, m.grow + dt * 0.4 * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(el * 8))))
        m.shape = shapeOf(m.grow)
        const st = Math.floor(m.grow * 10)
        if (st > h.step) {
          h.step = st
          growNote(st)
          m.sq.kick(0.5)
        }
        if (m.grow >= 1) {
          m.sq.kick(1.6)
          settle()
          drops(m.x, m.y - (m.shape.stemH + m.shape.capH * 0.5) * m.s, 6, m.shape.rx * m.s * 0.8)
        }
      }

      for (const m of shrooms) {
        m.sq.update(dt)
        m.tilt.update(dt)
        if (m.door) {
          if (m.door.want && time > m.door.until) m.door.want = 0
          m.door.open = damp(m.door.open, m.door.want, 12, dt)
        }
        m.lit = damp(m.lit, m.litOn ? 1 : 0, 3, dt)
        for (const l of m.lamps) l.swing.update(dt)
        if (m.chim && m.litOn) {
          m.smoke -= dt
          if (m.smoke <= 0) {
            m.smoke = isNight ? 0.9 : 1.9
            const p = chimPos(m, m.chim.u)
            puffs.push({ x: wx(m, p[0]), y: wy(m, p[1] - 44 * partScale(m)), r: 5 * m.s, vx: rand(-4, 8), life: 1 })
          }
        }
      }

      for (const gn of gnomes) updateGnome(gn, dt)
      if (time >= assignAt) {
        assignAt = time + 0.5
        assignHomes()
        for (let i = 0; i < SPOTS.length; i++) {
          if (spotFreeAt[i]! > 0 && time > spotFreeAt[i]! && reserve > 0) {
            spotFreeAt[i] = -1
            reserve--
            newGnome(i, true)
          }
        }
      }
      updateSnail(dt)

      // Pebbles that have landed become part of the picture.
      while (fresh.length && time - fresh[0]!.at > 0.34) {
        const nd = nodes[fresh.shift()!.i]!
        const size = depth(nd.y)
        if (nd.water) {
          paintStone(art.gladeG, nd.x, nd.y, size, nd.seed, 0)
          paintStone(art.gladeNightG, nd.x, nd.y, size, nd.seed, 1)
        } else {
          paintPebble(art.gladeG, nd.x, nd.y, size, nd.seed, 0)
          paintPebble(art.gladeNightG, nd.x, nd.y, size, nd.seed, 1)
        }
      }

      for (let i = returning.length - 1; i >= 0; i--) {
        const rt = returning[i]!
        rt.t += dt / 0.45
        if (rt.t >= 1) {
          returning.splice(i, 1)
          stock[rt.item.kind]++
          wood(360, 0.05)
        }
      }
      for (let i = 0; i < rise.length; i++) rise[i] = Math.min(1, rise[i]! + dt / 0.3)
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i]!.t += dt / 0.9
        if (ripples[i]!.t >= 1) ripples.splice(i, 1)
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]!
        p.life -= dt / 3.2
        p.y -= 15 * dt
        p.x += (p.vx + Math.sin(time * 1.3 + p.y * 0.05) * 5) * dt
        p.r += 3.4 * dt
        if (p.life <= 0) puffs.splice(i, 1)
      }
      for (const q of squiggles) {
        q.u += dt * 2.1
        if (q.u > STREAM.length - 2) q.u = 1
      }

      // The glade's own small sounds, far apart.
      if (time > burbleAt) {
        burbleAt = time + rand(5, 10)
        sfx.tone({ freq: rand(520, 760), to: rand(300, 420), dur: 0.09, type: 'sine', vol: 0.014 })
        sfx.tone({ freq: rand(600, 820), to: rand(340, 460), dur: 0.08, type: 'sine', vol: 0.012, delay: 0.13 })
      }
      if (isNight && time > cricketAt) {
        cricketAt = time + rand(2.6, 5.5)
        for (let i = 0; i < 3; i++) sfx.tone({ freq: 4100, dur: 0.035, type: 'sine', vol: 0.012, delay: i * 0.07 })
      }
    },

    draw(g) {
      glows.length = 0

      // Sky, sun, glade.
      if (night < 0.99) g.drawImage(art.skyDay, 0, 0, W, 350)
      if (night > 0.01) {
        g.globalAlpha = night
        g.drawImage(art.skyNight, 0, 0, W, 350)
        g.globalAlpha = 1
      }
      const idle = time - lastTouch
      const homes = shrooms.some((m) => m.litOn)
      const nudge = homes && idle > 16 && !sunHeld ? Math.sin(time * 2.4) * 0.07 * Math.min(1, (idle - 16) / 3) : 0
      drawSprite(g, art.sun, SUN.x, sunY, 0, 1, 1, Math.sin(time * 0.35) * 0.05 + nudge)
      g.strokeStyle = '#8a4a16'
      g.fillStyle = '#8a4a16'
      g.lineWidth = 3.4
      g.beginPath()
      if (night > 0.5) {
        g.arc(SUN.x - 16, sunY - 9, 6, 0.15 * Math.PI, 0.85 * Math.PI)
        g.moveTo(SUN.x + 22, sunY - 6)
        g.arc(SUN.x + 16, sunY - 9, 6, 0.15 * Math.PI, 0.85 * Math.PI)
        g.stroke()
      } else {
        g.arc(SUN.x - 16, sunY - 7, 3.6, 0, TAU)
        g.arc(SUN.x + 16, sunY - 7, 3.6, 0, TAU)
        g.fill()
        g.beginPath()
        g.arc(SUN.x, sunY + 4, 15, 0.2 * Math.PI, 0.8 * Math.PI)
        g.stroke()
      }

      if (night < 0.99) g.drawImage(art.glade, 0, 0, W, H)
      if (night > 0.01) {
        g.globalAlpha = night
        g.drawImage(art.gladeNight, 0, 0, W, H)
        g.globalAlpha = 1
      }

      // The water moving.
      g.strokeStyle = tone('#ffffff', night * 0.7)
      g.lineWidth = 3
      g.globalAlpha = 0.85
      g.beginPath()
      for (const q of squiggles) {
        const i = Math.floor(q.u)
        const s = STREAM[i]!
        const n = STREAM[i + 1]!
        const f = q.u - i
        const x = lerp(s.x, n.x, f) + s.ty * s.hw * q.off
        const y = lerp(s.y, n.y, f) - s.tx * s.hw * q.off
        if (onTray(x, y, 12)) continue
        const l = q.len * (0.6 + s.hw / 60)
        g.moveTo(x - l, y)
        g.quadraticCurveTo(x - l / 2, y - 5, x, y)
        g.quadraticCurveTo(x + l / 2, y + 5, x + l, y)
      }
      g.stroke()
      for (const rp of ripples) {
        g.globalAlpha = (1 - rp.t) * 0.9
        g.beginPath()
        g.ellipse(rp.x, rp.y, 10 + rp.t * 34, (10 + rp.t * 34) * 0.42, 0, 0, TAU)
        g.stroke()
      }
      g.globalAlpha = 1

      // Pebbles still landing.
      for (const f of fresh) {
        const nd = nodes[f.i]!
        const k = ease.outBack(clamp((time - f.at) / 0.22, 0, 1))
        if (k <= 0) continue
        if (nd.water) paintStone(g, nd.x, nd.y, depth(nd.y) * k, nd.seed, night)
        else paintPebble(g, nd.x, nd.y, depth(nd.y) * k, nd.seed, night)
      }

      // Before anything is grown, a bud shows where the moss is soft.
      if (shrooms.length === 0 && idle > 5 && holds.size === 0) {
        const at = Math.floor((time - 5) / 4.5) % 3
        const up = Math.sin((((time - 5) % 4.5) / 4.5) * Math.PI)
        const [bx, by] = at === 0 ? [760, 560] : at === 1 ? [330, 480] : [930, 440]
        g.save()
        g.beginPath()
        g.rect(bx - 40, by - 70, 80, 72)
        g.clip()
        drawSprite(g, art.bud, bx, by + 40 - up * 40, night, 1.9, 1.9, Math.sin(time * 5) * 0.06 * up)
        g.restore()
      }

      // The tray.
      const doorless = shrooms.some((m) => !m.door) && shrooms.every((m) => !m.door)
      for (let i = 0; i < KINDS.length; i++) {
        const kind = KINDS[i]!
        const n = stock[kind]
        if (n <= 0) continue
        const x = slotX(i)
        const v = variantOf(kind)
        const k = ease.outBack(rise[i]!)
        const wiggle = kind === 'door' && doorless && idle > 6 && holds.size === 0 ? Math.sin(time * 5) * 0.09 * Math.max(0, Math.sin(time * 0.9)) : 0
        drawItem(g, kind, v, x, TRAY.cy + (1 - k) * 14, k, wiggle)
      }
      for (const rt of returning) {
        const t = ease.inOutQuad(clamp(rt.t, 0, 1))
        drawItem(g, rt.item.kind, rt.item.variant, lerp(rt.fromX, slotX(rt.slot), t), lerp(rt.fromY, TRAY.cy, t) - Math.sin(t * Math.PI) * 40, 1, rt.item.rot * (1 - t))
      }

      // Everything that stands on the moss, back to front.
      order.length = 0
      for (let i = 0; i < shrooms.length; i++) order.push({ y: shrooms[i]!.y, kind: 0, i })
      for (let i = 0; i < gnomes.length; i++) if (gnomes[i]!.mode === 'ground') order.push({ y: gnomes[i]!.y + 0.5, kind: 1, i })
      for (let i = 0; i < ferns.length; i++) order.push({ y: ferns[i]!.y, kind: 2, i })
      for (let i = 0; i < loose.length; i++) order.push({ y: loose[i]!.y + 12, kind: 3, i })
      if (snail.on) order.push({ y: snail.y, kind: 4, i: 0 })
      order.sort((a, b) => a.y - b.y)
      for (const e of order) {
        if (e.kind === 0) drawShroom(g, shrooms[e.i]!)
        else if (e.kind === 1) drawGnome(g, gnomes[e.i]!)
        else if (e.kind === 2) {
          const f = ferns[e.i]!
          drawSprite(g, art.ferns[f.i]!, f.x, f.y, night, f.s, f.s, Math.sin(time * 0.7 + f.x * 0.01) * 0.025)
        } else if (e.kind === 3) {
          const it = loose[e.i]!
          drawItem(g, it.kind, it.variant, it.x, it.y, 0.8, it.rot)
        } else drawSnail(g)
      }

      // Chimney smoke, drawn as the curls a child draws.
      g.lineWidth = 3
      g.strokeStyle = tone('#a9a7ba', night * 0.5)
      for (const p of puffs) {
        g.globalAlpha = Math.min(1, p.life * 1.6) * 0.85
        g.beginPath()
        g.arc(p.x, p.y, p.r, p.life * 5, p.life * 5 + 4.6)
        g.stroke()
      }
      g.globalAlpha = 1

      // Lights in the dusk.
      if (night > 0.05) {
        for (const f of flies) {
          const x = f.x + Math.sin(time * 0.31 + f.p) * 46
          const y = f.y + Math.sin(time * 0.43 + f.p * 2) * 24
          const a = Math.max(0, Math.sin(time * 1.1 + f.p * 3))
          if (a < 0.1 || inWater(x, y)) continue
          g.globalAlpha = a * night
          g.fillStyle = '#fff3a0'
          g.beginPath()
          g.arc(x, y, 2.6, 0, TAU)
          g.fill()
          glows.push(x, y, 20, a * 0.8)
        }
        g.globalCompositeOperation = 'lighter'
        for (let i = 0; i < glows.length; i += 4) {
          const r = glows[i + 2]!
          g.globalAlpha = Math.min(1, glows[i + 3]! * night)
          g.drawImage(art.glow, glows[i]! - r, glows[i + 1]! - r, r * 2, r * 2)
        }
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      }

      // Whatever is in a hand goes on top.
      for (const h of holds.values()) {
        if (h.k !== 'part') continue
        const lift = h.fit ? 0.92 : 1.12
        drawItem(g, h.item.kind, h.item.variant, h.item.x, h.item.y, lift, h.item.rot)
      }
    },

    down(p: Pointer) {
      lastTouch = time = stage.time
      // The sun: the one thing that turns the day.
      if (dist(p.x, p.y, SUN.x, sunY) < 84) {
        holds.set(p.id, { k: 'sun', oy: sunY - p.y })
        sunHeld = true
        sfx.tone({ freq: sfx.scale(isNight ? -5 : 0), dur: 0.4, type: 'sine', vol: 0.05, attack: 0.02 })
        return
      }
      // A part from the tray.
      if (onTray(p.x, p.y, 8)) {
        const i = clamp(Math.round((p.x - TRAY.first) / TRAY.slot), 0, KINDS.length - 1)
        const kind = KINDS[i]!
        if (stock[kind] > 0 && Math.abs(p.x - slotX(i)) < 52) {
          const item: Item = { kind, variant: variantOf(kind), x: slotX(i), y: TRAY.cy, rot: 0 }
          stock[kind]--
          rise[i] = -0.4
          holds.set(p.id, { k: 'part', item, fit: null, target: null })
          wood(760, 0.07)
        } else {
          wood(210, 0.09)
          holds.set(p.id, { k: 'none' })
        }
        return
      }
      // A part left lying on the moss.
      for (let i = loose.length - 1; i >= 0; i--) {
        const it = loose[i]!
        if (dist(p.x, p.y, it.x, it.y) < 52) {
          loose.splice(i, 1)
          holds.set(p.id, { k: 'part', item: it, fit: null, target: null })
          wood(760, 0.07)
          return
        }
      }
      // A gnome is a little shy.
      for (const gn of gnomes) {
        if (gn.mode !== 'ground') continue
        const s = depth(gn.y) * GNOME
        if (Math.abs(p.x - gn.x) < 26 * s + 8 && p.y < gn.y + 10 && p.y > gn.y - 92 * s) {
          gn.shy.value = 0.82
          gn.shy.kick(2.5)
          if (!gn.moving) gn.face = p.x > gn.x ? 1 : -1
          sfx.tone({ freq: sfx.scale(-3 + (gn.id % 4)), dur: 0.25, type: 'sine', vol: 0.06, attack: 0.01 })
          // A path may still be drawn from where it stands.
          holds.set(p.id, { k: 'path', lx: p.x, ly: Math.max(p.y, gn.y), prev: -1, first: nodes.length, laid: 0, flower: false })
          return
        }
      }
      // Leaves and sky: the rain is still in the trees.
      if (p.y < skyline(p.x) + 36 || blocked(p.x, p.y)) {
        rustle()
        drops(p.x, p.y, 5, 44)
        drip(0.25)
        drip(0.4)
        holds.set(p.id, { k: 'none' })
        return
      }
      // The stream.
      if (inWater(p.x, p.y)) {
        ripples.push({ x: p.x, y: p.y, t: 0 })
        plop()
        drops(p.x, p.y, 3, 14)
        holds.set(p.id, { k: 'path', lx: p.x, ly: p.y, prev: -1, first: nodes.length, laid: 0, flower: false })
        return
      }
      // A part that is already fitted: it answers, and comes off if pulled.
      const pull = partAt(p.x, p.y)
      if (pull) {
        nudge(pull)
        holds.set(p.id, { k: 'pull', pull })
        return
      }
      // A mushroom already there keeps growing.
      const y = clamp(p.y, GROUND.top, GROUND.bottom)
      let m = shroomAt(p.x, p.y)
      if (!m && !canGrowAt(p.x, y)) {
        // Too near another one: that one takes the press.
        const s = depth(y)
        m = shrooms.find((o) => Math.abs(o.x - p.x) < 78 * s && Math.abs(o.y - y) < 30) ?? null
      }
      if (m) {
        m.held++
        m.sq.kick(-2.2)
        pat()
        drops(m.x, m.y - (m.shape.stemH + m.shape.capH * 0.4) * m.s, 3, m.shape.rx * m.s * 0.7)
        const [sx, sy] = doorstep(m)
        holds.set(p.id, { k: 'grow', m, fresh: false, g0: m.grow, t0: time, step: Math.floor(m.grow * 10), sx, sy: sy + 4 })
        return
      }
      // Bare moss: a new one pushes up.
      if (shrooms.length < MAX_SHROOMS && canGrowAt(p.x, y)) {
        const born: Shroom = {
          id: nextId++,
          x: p.x,
          y,
          s: depth(y),
          grow: 0.05,
          kind: capAt(p.x, y),
          seed: 1 + Math.floor(stage.rand() * 1e6),
          shape: shapeOf(0.05),
          spr: null,
          held: 1,
          sq: spring(0.3, 200, 10),
          tilt: spring(0, 110, 8),
          door: null,
          wins: [],
          chim: null,
          balcs: [],
          ladders: [],
          lamps: [],
          line: null,
          owner: null,
          lit: 0,
          litOn: false,
          smoke: 0,
        }
        born.sq.target = 1
        shrooms.push(born)
        earth()
        crumbs(p.x, y)
        holds.set(p.id, { k: 'grow', m: born, fresh: true, g0: 0, t0: time, step: 0, sx: p.x, sy: p.y })
        return
      }
      // Nowhere for a mushroom: the moss gives a flower instead (on lifting).
      holds.set(p.id, { k: 'path', lx: p.x, ly: p.y, prev: -1, first: nodes.length, laid: 0, flower: true })
      pat()
    },

    move(p: Pointer) {
      const h = holds.get(p.id)
      if (!h) return
      lastTouch = time
      if (h.k === 'sun') {
        sunY = clamp(p.y + h.oy, SUN.up, SUN.down)
      } else if (h.k === 'part') {
        h.item.x = p.x
        h.item.y = p.y - 44
        h.item.rot = clamp(p.vx / 2600, -0.25, 0.25)
        const found = findFit(h.item.kind, h.item.x, h.item.y)
        h.fit = found?.fit ?? null
        h.target = found?.m ?? null
        ghost = found ? { m: found.m, fit: found.fit, variant: h.item.variant } : null
      } else if (h.k === 'grow') {
        const moved = dist(p.x, p.y, p.startX, p.startY)
        // A press that wanders early on was a line all along. Once the mushroom
        // has really grown under the finger it stays a mushroom.
        if (moved > 42 && (time - h.t0 < 1.2 || h.m.grow - h.g0 < 0.3)) {
          // It was a line, not a press: the sprout ducks back and pebbles go down.
          const m = h.m
          m.held--
          if (h.fresh) {
            const i = shrooms.indexOf(m)
            if (i >= 0) shrooms.splice(i, 1)
          } else {
            m.grow = h.g0
            m.shape = shapeOf(m.grow)
            if (m.held === 0) bake(m)
          }
          const next: Hold & { k: 'path' } = { k: 'path', lx: h.sx, ly: h.sy, prev: -1, first: nodes.length, laid: 0, flower: false }
          holds.set(p.id, next)
          if (layable(next.lx, next.ly)) {
            next.prev = addNode(next.lx, next.ly, -1)
            next.laid++
          }
          lay(next, p.x, p.y)
        } else if (moved > 42) {
          h.m.tilt.target = clamp((p.x - h.m.x) / 500, -0.1, 0.1)
        }
      } else if (h.k === 'pull') {
        if (dist(p.x, p.y, p.startX, p.startY) < 30) return
        const pl = h.pull
        // It may have gone already, under another finger.
        const there =
          pl.kind === 'lantern' ? pl.i < pl.m.lamps.length : pl.kind === 'window' ? pl.i < pl.m.wins.length : pl.kind === 'balcony' ? pl.i < pl.m.balcs.length : pl.kind === 'ladder' ? pl.i < pl.m.ladders.length : pl.kind === 'chimney' ? !!pl.m.chim : !!pl.m.line
        if (!there) {
          holds.set(p.id, { k: 'none' })
          return
        }
        const item = detach(pl)
        item.x = p.x
        item.y = p.y - 44
        holds.set(p.id, { k: 'part', item, fit: null, target: null })
      } else if (h.k === 'path') {
        if (h.laid === 0 && dist(p.x, p.y, p.startX, p.startY) < 30) return
        h.flower = false
        lay(h, p.x, p.y)
      }
    },

    up(p: Pointer) {
      const h = holds.get(p.id)
      if (!h) return
      holds.delete(p.id)
      lastTouch = time
      if (h.k === 'sun') {
        sunHeld = [...holds.values()].some((o) => o.k === 'sun')
        sunGoal = sunY > (SUN.up + SUN.down) / 2 ? SUN.down : SUN.up
      } else if (h.k === 'grow') {
        const m = h.m
        m.held--
        m.tilt.target = 0
        if (m.held === 0) bake(m)
        m.sq.kick(h.fresh ? 2.4 : 1.4)
        if (m.grow < 1) sfx.tone({ freq: 130, to: 85, dur: 0.12, type: 'sine', vol: 0.09 })
        drops(m.x, m.y - m.shape.stemH * m.s, 3, m.shape.rx * m.s * 0.6)
      } else if (h.k === 'path') {
        if (h.laid > 0) finishPath(h.first)
        else if (h.flower && layable(p.x, p.y) && !inWater(p.x, p.y)) {
          const seed = 1 + Math.floor(Math.random() * 1e6)
          paintFlower(art.gladeG, p.x, p.y, 1.25, seed, 0)
          paintFlower(art.gladeNightG, p.x, p.y, 1.25, seed, 1)
          sfx.tone({ freq: sfx.scale(Math.floor(Math.random() * 5)), dur: 0.35, type: 'sine', vol: 0.06, attack: 0.01 })
        }
      } else if (h.k === 'part') {
        ghost = null
        const it = h.item
        const found = h.fit && h.target ? { m: h.target, fit: h.fit } : findFit(it.kind, it.x, it.y)
        if (found && shrooms.includes(found.m)) {
          attach(found.m, found.fit, it.variant)
        } else if (it.y > skyline(it.x) + 50 && it.y < 664 && !inWater(it.x, it.y) && !blocked(it.x, it.y) && loose.length < 12) {
          // It rests where it was put down, and can be picked up again.
          it.rot = clamp(it.rot + (Math.random() * 2 - 1) * 0.2, -0.3, 0.3)
          loose.push(it)
          pat()
        } else {
          returning.push({ item: it, fromX: it.x, fromY: it.y, t: 0, slot: KINDS.indexOf(it.kind) })
          if (inWater(it.x, it.y)) plop()
        }
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'mushroom-village',
    name: 'Mushroom Village',
    emoji: '🍄',
    ages: [3, 7],
    pitch: 'Press the moss to grow mushrooms, fit them with doors and windows, lay pebble paths, and the gnomes move in.',
    howTo: 'Press and hold the green to grow a mushroom (longer is taller). Drag parts from the tray onto it; a door brings a gnome. Drag across the green to lay a path, across the stream for stepping stones. A fitted part pulls off again. Pull the sun down for evening, lift it for morning.',
    basedOn: 'Waldorf gnome stories and nature-table play: the earth folk at home, small-world building with simple parts',
    whyFun: 'A mushroom swells up under your finger for exactly as long as you press, and a gnome carries its bundle up the very path you drew and lights the window.',
    set: 'gentle',
  },
  create,
}
