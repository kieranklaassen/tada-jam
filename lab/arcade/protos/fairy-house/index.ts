// Fairy House: build a home in the roots of a tree from things gathered in
// the wood, pull the evening down, and watch small folk come and live in
// exactly what was built. Raise the sun and it is morning again.
//
// By day the hand builds and nothing else happens. By dusk the hand rests and
// the folk use the house. There is no plan, no count and no praise.

import { clamp, damp, dist, ease, lerp, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { APERTURE, KNOT, buildArt, drawSprite } from './art.ts'
import type { Kind } from './art.ts'
import { LOOKS, drawFolk, drawLantern } from './folk.ts'
import type { Look, Pose } from './folk.ts'
import { makeSounds } from './sound.ts'
import { CX, HOLLOW, MUSHROOMS, PUDDLE, SUN, floorBack, hillY, inHollow, inPuddle, moundTop } from './world.ts'

type G = CanvasRenderingContext2D

// Half the length and half the thickness of each thing, for picking it up and
// for knowing where its ends are.
const HALF: Record<Kind, number> = { bark: 90, twig: 74, moss: 46, acorn: 27, pebble: 28, leaf: 72, feather: 64, shell: 54 }
const THICK: Record<Kind, number> = { bark: 27, twig: 10, moss: 30, acorn: 22, pebble: 21, leaf: 34, feather: 18, shell: 40 }
const DUST: Record<Kind, readonly string[]> = {
  bark: ['#8a6a48', '#6a4c36', '#b08d64'],
  twig: ['#8a6a48', '#b08d64'],
  moss: ['#86a947', '#b7cf6c', '#587b31'],
  acorn: ['#b08d64', '#8a6a48'],
  pebble: ['#b9ad98', '#8a6a48', '#d5cdbf'],
  leaf: ['#d4b45e', '#b8763a'],
  feather: ['#fbf6e8'],
  shell: ['#e8c98d', '#b08d64'],
}

interface Piece {
  kind: Kind
  v: number
  x: number
  y: number
  // Where the finger wants it while held.
  tx: number
  ty: number
  angle: number
  // The angle it settles to, and the way it lies on flat ground.
  rest: number
  flat: number
  wob: Spring
  sq: Spring
  lift: number
  held: boolean
  // The child has put it somewhere.
  placed: boolean
  zone: 'floor' | 'tree'
  fallY: number | null
  vy: number
  water: boolean
  level: number
  lampOn: boolean
  lamp: number
  carried: Folk | null
  tilt: number
  tiltTo: number
  glint: number
}

type SpotKind = 'bed' | 'moss' | 'bowl' | 'path' | 'bath' | 'ladder' | 'beam' | 'roof' | 'deck' | 'feather' | 'mossy' | 'door' | 'inside'

interface Spot {
  kind: SpotKind
  pieces: Piece[]
  // Where a folk walks to first, the anchor of the activity, and a second
  // point (the top of a ladder, the far end of a beam).
  ax: number
  ay: number
  x: number
  y: number
  x2: number
  y2: number
  // A direction: toward the pillow for a bed, the side a bowl is sipped from.
  ux: number
  uy: number
  used: boolean
  taken: Folk | null
}

interface Hop {
  x0: number
  y0: number
  x1: number
  y1: number
  h: number
  dur: number
  t: number
}

interface Folk {
  i: number
  look: Look
  mode: 'away' | 'wait' | 'fly' | 'pop' | 'idle' | 'walk' | 'act' | 'fade' | 'leave'
  x: number
  y: number
  homeX: number
  homeY: number
  landX: number
  landY: number
  // 0 is a light, 1 is a small person.
  form: number
  alpha: number
  t: number
  ph: number
  pt: number
  n: number
  spot: Spot | null
  resting: boolean
  hop: Hop | null
  landed: boolean
  fromX: number
  fromY: number
  pose: Pose
  tg: Pose
  sq: Spring
  hat: Spring
  lamp: 'none' | 'held' | 'down'
  lampGlow: number
  clip: { x: number; y: number } | null
  bob: number
  vx: number
}

interface Fly {
  x: number
  y: number
  ax: number
  ay: number
  hx: number
  hy: number
  tx: number
  ty: number
  // Seconds left of following a finger.
  follow: number
  p1: number
  p2: number
  w1: number
  w2: number
  r: number
  a: number
  delay: number
}

type Hold = { kind: 'piece'; piece: Piece; ox: number; oy: number; lx: number; vx: number; x0: number; y0: number } | { kind: 'sun'; oy: number } | { kind: 'water'; x: number; y: number; drip: number }

const REST: readonly (readonly SpotKind[])[] = [
  ['bed', 'moss', 'mossy'],
  ['path', 'roof', 'ladder', 'beam', 'deck', 'door'],
  ['bath', 'bowl', 'moss', 'bed', 'inside'],
]
const VISIT: Record<SpotKind, number> = { bed: 7, moss: 5.5, bowl: 6.2, path: 0, bath: 7.5, ladder: 0, beam: 0, roof: 5.2, deck: 6, feather: 5.5, mossy: 6, door: 5, inside: 5 }

const neutral = (): Pose => ({ rot: 0, stretch: 1, eyes: 0, sit: 0, lx: 0, ly: 0, rx: 0, ry: 0, hat: 0, look: 0, step: 0, size: 1 })

function mix(a: readonly number[], b: readonly number[], t: number): string {
  return `rgb(${Math.round(lerp(a[0]!, b[0]!, t))},${Math.round(lerp(a[1]!, b[1]!, t))},${Math.round(lerp(a[2]!, b[2]!, t))})`
}

const SKY = {
  dayTop: [164, 207, 226],
  dayLow: [247, 238, 214],
  goldTop: [150, 170, 204],
  goldLow: [250, 200, 142],
  duskTop: [27, 34, 78],
  duskLow: [104, 82, 124],
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const S = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1))
  const art = buildArt(1 + Math.floor(stage.rand() * 100000), S)
  const snd = makeSounds(sfx)

  // ---------------------------------------------------------------- pieces

  const pieces: Piece[] = []
  const add = (kind: Kind, x: number, y: number, flat: number, v: number) => {
    pieces.push({
      kind,
      v: v % art.pieces[kind].length,
      x: x + (stage.rand() - 0.5) * 10,
      y: y + (stage.rand() - 0.5) * 6,
      tx: x,
      ty: y,
      angle: flat,
      rest: flat,
      flat,
      wob: spring(0, 150, 9),
      sq: spring(1, 240, 13),
      lift: 0,
      held: false,
      placed: false,
      zone: 'floor',
      fallY: null,
      vy: 0,
      water: false,
      level: 0,
      lampOn: false,
      lamp: 0,
      carried: null,
      tilt: 0,
      tiltTo: 0,
      glint: 0,
    })
  }
  const j = () => (stage.rand() - 0.5) * 0.14
  add('bark', 116, 628, -0.05 + j(), 0)
  add('bark', 232, 640, 0.09 + j(), 1)
  add('bark', 150, 662, 0.02 + j(), 2)
  add('shell', 312, 688, 0, 0)
  add('twig', 112, 719, 0.1 + j(), 0)
  add('twig', 236, 714, -0.14 + j(), 1)
  add('twig', 150, 737, -0.05 + j(), 2)
  add('twig', 244, 748, 0.06 + j(), 0)
  add('twig', 116, 755, 0.02 + j(), 1)
  add('acorn', 360, 733, 0, 0)
  add('acorn', 402, 712, 0, 1)
  add('leaf', 478, 739, -0.16 + j(), 0)
  add('leaf', 604, 750, 0.1 + j(), 1)
  add('leaf', 726, 737, -0.03 + j(), 2)
  add('feather', 838, 756, -0.1, 0)
  add('acorn', 1010, 668, 0, 0)
  add('moss', 1092, 618, 0, 0)
  add('moss', 1138, 668, 0, 1)
  add('moss', 1052, 664, 0, 2)
  add('shell', 1128, 723, 0, 1)
  add('pebble', 1056, 733, j(), 0)
  add('pebble', 1090, 753, j(), 1)
  add('pebble', 1142, 756, j(), 2)
  add('pebble', 842, 690, j(), 3)
  add('pebble', 798, 705, j(), 4)
  add('pebble', 1022, 756, j(), 2)
  add('pebble', 760, 690, j(), 0)
  pieces.sort((a, b) => a.y - b.y)

  const holds = new Map<number, Hold>()
  let lastTouch = 0
  let touched = false

  const local = (p: Piece, x: number, y: number): [number, number] => {
    const c = Math.cos(-p.angle)
    const s = Math.sin(-p.angle)
    const dx = x - p.x
    const dy = y - p.y
    return [dx * c - dy * s, dx * s + dy * c]
  }
  const pieceAt = (x: number, y: number): Piece | null => {
    let near: Piece | null = null
    let nearD = 1
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i]!
      if (p.held || p.carried) continue
      const [lx, ly] = local(p, x, y)
      const d = (lx / (HALF[p.kind] + 5)) ** 2 + (ly / (THICK[p.kind] + 7)) ** 2
      if (d < 1) return p
      // Small things are easy to catch; big ones need little help.
      const far = (lx / Math.max(HALF[p.kind] + 12, 54)) ** 2 + (ly / Math.max(THICK[p.kind] + 12, 48)) ** 2
      if (far < nearD) {
        nearD = far
        near = p
      }
    }
    return near
  }

  const zoneAt = (x: number, y: number): 'floor' | 'tree' => (y < floorBack(x) - 4 && y >= moundTop(x) ? 'tree' : 'floor')
  const restAngle = (p: Piece): number => {
    if (p.zone === 'floor') return p.flat
    const dx = p.x - CX
    if (p.kind === 'bark') return clamp(dx / 120, -1, 1) * 0.92
    if (p.kind === 'twig') return clamp(dx / 60, -1, 1) * 1.2
    if (p.kind === 'leaf' || p.kind === 'feather') return p.flat + clamp(dx / 200, -1, 1) * 0.3
    return p.flat
  }

  const marks: { x: number; y: number; t: number }[] = []
  const ripples: { x: number; y: number; t: number }[] = []
  const wet: { x: number; y: number; t: number }[] = []

  const fill = (p: Piece) => {
    if (p.water) return
    p.water = true
    snd.plop(0)
    stage.after(0.12, () => snd.plop(3))
    stage.after(0.24, () => snd.plop(6))
  }

  const land = (p: Piece, strength: number) => {
    if (night) stage.after(0, refreshSpots)
    p.sq.value = 1 - (p.kind === 'moss' ? 0.34 : 0.2) * strength
    p.wob.kick((p.x < CX ? 1 : -1) * rnd(1.2, 2.4) * strength)
    snd.drop(p.kind, 0.6 + 0.4 * strength)
    if (inPuddle(p.x, p.y)) {
      snd.splash()
      ripples.push({ x: p.x, y: p.y, t: 0 })
      fx.burst(p.x, p.y, { count: 6, color: ['#c9e0e4', '#8bb2c6'], speed: 130, life: 0.45, size: 8.4, gravity: 600, angle: -Math.PI / 2, spread: 1.6 })
      if (p.kind === 'shell' || p.kind === 'acorn') fill(p)
      return
    }
    if (p.kind === 'pebble') {
      for (const q of pieces) {
        if (q !== p && q.kind === 'pebble' && dist(p.x, p.y, q.x, q.y) < 56) {
          snd.clack()
          q.sq.value = 0.94
          break
        }
      }
    }
    if (p.kind !== 'feather') {
      fx.burst(p.x, p.y + THICK[p.kind] * 0.5, { count: p.kind === 'bark' ? 7 : 4, color: DUST[p.kind], speed: 150 * strength, life: 0.55, size: 9, gravity: 260, angle: -Math.PI / 2, spread: 2.8, drag: 0.9 })
    }
  }

  const settle = (p: Piece) => {
    p.x = clamp(p.x, 46, W - 46)
    p.y = Math.min(p.y, 764)
    const fb = floorBack(p.x)
    const mt = moundTop(p.x)
    let to = p.y
    if (p.y >= fb - 4) p.zone = 'floor'
    else if (inHollow(p.x, p.y) && p.y < 540) {
      p.zone = 'tree'
      to = 546 + rnd(0, 22)
    } else if (p.y >= mt) p.zone = 'tree'
    else if (Number.isFinite(mt)) {
      p.zone = 'tree'
      to = mt + 12
    } else {
      p.zone = 'floor'
      to = fb + 14 + rnd(0, 12)
    }
    p.rest = restAngle(p)
    p.placed = true
    if (to > p.y + 2) {
      p.fallY = to
      p.vy = 60
      snd.air()
    } else land(p, 1)
  }

  // ---------------------------------------------------------------- the sun

  let sunY = SUN.top
  let sunLevel = 0
  const sunSq = spring(1, 170, 9)
  let night = false
  let nightT = 0
  let hollowGlow = 0
  let skyGrad: CanvasGradient | null = null
  let skyFor = -1
  const levelOf = (y: number) => Math.floor(clamp((y - 150) / 44, 0, 4.99))
  const crest = hillY(SUN.x)
  const dayAmt = () => {
    const t = clamp((crest + 26 - sunY) / (crest + 26 - 150), 0, 1)
    return t * t * (3 - 2 * t)
  }

  // ---------------------------------------------------------------- folk

  const homes: [number, number][] = [
    [36, 470],
    [1150, 452],
    [262, 452],
  ]
  const lands: [number, number][] = [
    [566, 668],
    [846, 664],
    [700, 678],
  ]
  const folk: Folk[] = LOOKS.map((look, i) => ({
    i,
    look,
    mode: 'away',
    x: homes[i]![0],
    y: homes[i]![1],
    homeX: homes[i]![0],
    homeY: homes[i]![1],
    landX: lands[i]![0],
    landY: lands[i]![1],
    form: 0,
    alpha: 0,
    t: 0,
    ph: 0,
    pt: 0,
    n: 0,
    spot: null,
    resting: false,
    hop: null,
    landed: false,
    fromX: 0,
    fromY: 0,
    pose: neutral(),
    tg: neutral(),
    sq: spring(1, 200, 11),
    hat: spring(0, 60, 5),
    lamp: 'none',
    lampGlow: 0,
    clip: null,
    bob: 0,
    vx: 0,
  }))
  const order = [...folk]
  let spots: Spot[] = []

  const spot = (kind: SpotKind, ps: Piece[], x: number, y: number, ax = x, ay = y, x2 = x, y2 = y, ux = 0, uy = -1): Spot => ({
    kind,
    pieces: ps,
    ax: clamp(ax, 40, W - 40),
    ay: Math.min(ay, 786),
    x,
    y,
    x2,
    y2,
    ux,
    uy,
    used: false,
    taken: null,
  })

  // Read the house the child built into things a small person can do.
  const buildSpots = () => {
    spots = []
    const built = pieces.filter((p) => p.placed && !p.held && p.fallY === null)
    const moss = new Set(built.filter((p) => p.kind === 'moss'))
    for (const p of built) {
      if (p.kind !== 'leaf') continue
      let pillow: Piece | null = null
      let best = 104
      for (const m of moss) {
        const d = dist(p.x, p.y, m.x, m.y)
        if (d < best) {
          best = d
          pillow = m
        }
      }
      let ux = Math.cos(p.angle)
      let uy = Math.sin(p.angle)
      if (uy > 0.05 || (Math.abs(uy) <= 0.05 && ux > 0)) {
        ux = -ux
        uy = -uy
      }
      let fx0 = p.x - ux * 40
      let fy0 = p.y - uy * 40 - 4
      const ps = [p]
      if (pillow) {
        moss.delete(pillow)
        ps.push(pillow)
        if (best > 26) {
          ux = (pillow.x - p.x) / best
          uy = (pillow.y - p.y) / best
          fx0 = pillow.x - ux * 62
          fy0 = pillow.y - 4 - uy * 62
        }
      }
      spots.push(spot('bed', ps, fx0, fy0, fx0 - ux * 20, fy0 + 20, fx0, fy0, ux, uy))
    }
    for (const m of moss) spots.push(spot('moss', [m], m.x, m.y - 2, m.x + (m.x < CX ? -50 : 50), m.y + 16))
    for (const p of built) {
      if (p.kind === 'acorn') {
        const side = p.x < 620 ? 1 : -1
        spots.push(spot('bowl', [p], p.x + side * 44, p.y + 12, p.x + side * 44, p.y + 12, p.x, p.y, side, 0))
      } else if (p.kind === 'shell') {
        const c = Math.cos(p.angle)
        const s = Math.sin(p.angle)
        const ax = p.x + APERTURE.x * c - APERTURE.y * s
        const ay = p.y + APERTURE.x * s + APERTURE.y * c
        spots.push(spot('bath', [p], ax, ay, ax + 46, ay + 44))
      } else if (p.kind === 'twig') {
        const c = Math.cos(p.angle) * HALF.twig
        const s = Math.sin(p.angle) * HALF.twig
        const lowFirst = s > 0
        const lx = p.x + (lowFirst ? c : -c)
        const ly = p.y + (lowFirst ? s : -s)
        const hx = p.x - (lowFirst ? c : -c)
        const hy = p.y - (lowFirst ? s : -s)
        if (Math.abs(Math.sin(p.angle)) > 0.5) spots.push(spot('ladder', [p], lx, ly, lx, ly + 6, hx, hy))
        else {
          const leftFirst = lx < hx
          spots.push(spot('beam', [p], leftFirst ? lx : hx, leftFirst ? ly : hy, (leftFirst ? lx : hx) - 22, (leftFirst ? ly : hy) + 14, leftFirst ? hx : lx, leftFirst ? hy : ly))
        }
      } else if (p.kind === 'bark') {
        if (p.zone === 'tree') {
          const c = Math.cos(p.angle) * (HALF.bark - 10)
          const s = Math.sin(p.angle) * (HALF.bark - 10)
          const up = s > 0 ? -1 : 1
          // Under the roof: in the doorway when the bark is over the hollow.
          const sx = p.x + clamp(CX - p.x, -64, 64)
          const door = Math.abs(sx - CX) < HOLLOW.hw - 14
          const sy = door ? 592 : Math.min(p.y + 56, floorBack(sx) + 8)
          spots.push(spot('roof', [p], sx, sy, sx, sy, p.x + up * c, p.y + up * s + 8))
        } else spots.push(spot('deck', [p], p.x - 34, p.y - 8, p.x - 60, p.y + 14))
      } else if (p.kind === 'feather') {
        spots.push(spot('feather', [p], p.x - 30, p.y + 12))
      }
    }
    // Pebbles near each other are one path.
    const stones = built.filter((p) => p.kind === 'pebble')
    const seen = new Set<Piece>()
    for (const first of stones) {
      if (seen.has(first)) continue
      const group: Piece[] = []
      const queue = [first]
      seen.add(first)
      while (queue.length > 0) {
        const p = queue.pop()!
        group.push(p)
        for (const q of stones) {
          if (!seen.has(q) && dist(p.x, p.y, q.x, q.y) < 160) {
            seen.add(q)
            queue.push(q)
          }
        }
      }
      const xs = group.map((p) => p.x)
      const ys = group.map((p) => p.y)
      const wide = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys)
      group.sort((a, b) => (wide ? a.x - b.x : a.y - b.y))
      const a = group[0]!
      const b = group[group.length - 1]!
      // Walk the path toward the door.
      if (dist(a.x, a.y, CX, 600) < dist(b.x, b.y, CX, 600)) group.reverse()
      const start = group[0]!
      spots.push(spot('path', group, start.x, start.y, start.x + (start.x < CX ? -40 : 40), start.y + 12))
    }
    // What the tree itself offers when nothing else is there.
    spots.push(spot('mossy', [], 452 - 0.9 * 36, 566 + 0.44 * 36, 430, 600, 0, 0, 0.9, -0.44))
    spots.push(spot('mossy', [], 956 + 0.9 * 36, 568 + 0.44 * 36, 990, 602, 0, 0, -0.9, -0.44))
    spots.push(spot('door', [], 812, 622, 830, 640))
    spots.push(spot('inside', [], CX - 44, 578, CX - 30, 606))
    spots.push(spot('inside', [], CX + 40, 580, CX + 30, 608))
    spots.push(spot('inside', [], CX, 584, CX, 610))
  }

  const fixed = (k: SpotKind) => k === 'mossy' || k === 'door' || k === 'inside'

  const choose = (f: Folk): Spot | null => {
    let best: Spot | null = null
    let bestD = Infinity
    for (const s of spots) {
      if (s.used || s.taken || fixed(s.kind)) continue
      const d = dist(f.x, f.y, s.ax, s.ay)
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    if (best) {
      f.resting = false
      return best
    }
    // Nothing left to try: find a place for the night. If the favourite is
    // only being tried by someone else, wait for it.
    for (const kind of REST[f.i]!) {
      const s = spots.find((c) => c.kind === kind && (!c.taken || !c.taken.resting))
      if (!s) continue
      if (s.taken) return null
      f.resting = true
      return s
    }
    f.resting = true
    return spots.find((c) => c.kind === 'inside' && !c.taken) ?? spots[spots.length - 1]!
  }

  const hopTo = (f: Folk, x: number, y: number, h = 24, dur = 0.44) => {
    f.hop = { x0: f.x, y0: f.y, x1: x, y1: y, h, dur, t: 0 }
    f.sq.value = 0.86
  }

  // A folk steps away from what it was doing (the thing was picked up).
  const release = (f: Folk) => {
    const s = f.spot
    if (!s) return
    for (const p of s.pieces) {
      if (p.carried === f) p.carried = null
      p.tiltTo = 0
    }
    s.taken = null
    f.spot = null
    f.clip = null
    f.lamp = 'none'
    f.hop = null
    f.mode = 'idle'
    f.sq.value = 1.12
  }

  const disturb = (piece: Piece) => {
    piece.lampOn = false
    for (const f of folk) if (f.spot && f.spot.pieces.includes(piece)) release(f)
    spots = spots.filter((s) => !s.pieces.includes(piece))
  }

  // The house changed while the folk are here: read it again, keeping what
  // each of them is in the middle of.
  const same = (a: Spot, b: Spot) => a.kind === b.kind && a.pieces[0] === b.pieces[0] && a.pieces.length === b.pieces.length && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1
  const refreshSpots = () => {
    if (!night) return
    const old = spots
    buildSpots()
    for (const s of spots) {
      const m = old.find((o) => same(o, s))
      if (m) s.used = m.used
    }
    for (const f of folk) {
      const os = f.spot
      if (!os) continue
      const m = spots.find((s) => same(os, s))
      if (m) {
        m.taken = f
        f.spot = m
      } else release(f)
    }
  }

  const startNight = () => {
    night = true
    nightT = 0
    snd.fifth()
    buildSpots()
    folk.forEach((f, i) => {
      f.mode = 'wait'
      f.t = -(1.4 + i * 2.3)
      f.spot = null
      f.resting = false
      f.hop = null
      f.clip = null
      f.lamp = 'none'
      f.form = 0
      if (f.alpha < 0.05) {
        f.x = f.homeX
        f.y = f.homeY
      }
    })
    const built = pieces.filter((p) => p.placed)
    flies.forEach((fl, i) => {
      fl.delay = 1 + i * 0.45
      fl.ax = rnd(40, W - 40)
      fl.ay = rnd(410, 640)
      const p = built.length > 0 && i % 5 < 3 ? built[i % built.length]! : null
      fl.hx = p ? p.x + rnd(-60, 60) : rnd(420, 980)
      fl.hy = p ? p.y - rnd(20, 90) : rnd(430, 660)
      fl.follow = 0
    })
  }

  const startMorning = () => {
    night = false
    for (let i = 0; i < 3; i++) stage.after(0.5 + i * 0.7 + Math.random() * 0.3, () => snd.bird())
    for (const p of pieces) {
      p.lampOn = false
      p.carried = null
      p.tiltTo = 0
    }
    for (const f of folk) {
      if (f.mode === 'away') continue
      f.clip = null
      f.lamp = 'none'
      f.hop = null
      f.spot = null
      f.mode = f.form > 0.05 ? 'fade' : 'leave'
      f.t = 0
      f.fromX = f.x
      f.fromY = f.y
    }
  }

  // One step of whatever a folk is doing at a spot. True when the visit is
  // over. A folk that is resting stays until morning.
  const act = (f: Folk, s: Spot, dt: number): boolean => {
    const tg = f.tg
    const p0 = s.pieces[0]
    if (f.hop) return false
    f.pt += dt
    const timeUp = !f.resting && VISIT[s.kind] > 0 && f.t > VISIT[s.kind]
    if (timeUp && f.ph < 90) {
      f.ph = 90
      f.pt = 0
    }
    switch (s.kind) {
      case 'bed':
      case 'mossy': {
        if (f.ph === 0) {
          hopTo(f, s.x, s.y, 28, 0.5)
          f.ph = 1
        } else if (f.ph === 1) {
          if (p0) {
            p0.sq.value = 0.86
            snd.drop('leaf', 0.7)
          } else snd.hush()
          const pillow = s.pieces[1]
          if (pillow) stage.after(0.5, () => (pillow.sq.value = 0.8))
          f.ph = 2
          f.pt = 0
        } else if (f.ph === 2) {
          tg.rot = Math.atan2(s.ux, -s.uy)
          tg.eyes = f.pt > 2.4 ? 1 : 0
          tg.lx = 6
          tg.rx = -6
        } else if (f.pt > 0.7) return true
        return false
      }
      case 'moss': {
        if (f.ph === 0) {
          hopTo(f, s.x, s.y, 30, 0.5)
          f.ph = 1
          f.n = 0
        } else if (f.ph === 1) {
          if (f.landed && p0) {
            p0.sq.value = 0.68
            snd.drop('moss', 0.7)
          }
          if (f.n < 2 && f.pt > 0.7) {
            hopTo(f, s.x, s.y, 20, 0.42)
            f.n++
            f.pt = 0
          } else if (f.n >= 2) {
            // Sit a while; to stay the night, curl up across it.
            if (f.resting && f.pt > 2.5) {
              hopTo(f, s.x - 30, s.y - 2, 12, 0.36)
              f.ph = 2
              f.pt = 0
            } else tg.sit = 1
          }
        } else if (f.ph === 2) {
          tg.rot = 1.3
          tg.eyes = f.pt > 2 ? 1 : 0
          tg.lx = 6
          tg.rx = -6
          if (!f.resting) {
            f.ph = 90
            f.pt = 0
          }
        } else if (f.pt > 0.5) return true
        return false
      }
      case 'bowl': {
        if (f.ph >= 90) {
          if (p0) p0.tiltTo = 0
          return f.pt > 0.4
        }
        tg.sit = 1
        const side = s.ux
        const sleepy = f.resting && f.t > 12
        const cyc = f.pt % 2.6
        if (cyc < 0.95 && !sleepy) {
          tg.rot = -side * 0.3
          tg.lx = -side * 9
          tg.rx = -side * 9
          tg.ly = -5
          tg.ry = -5
          if (p0) p0.tiltTo = side * 0.24
          const k = Math.floor(f.pt / 2.6)
          if (cyc > 0.45 && f.n <= k) {
            f.n = k + 1
            snd.sip()
          }
        } else if (p0) p0.tiltTo = 0
        tg.eyes = sleepy ? 1 : 0
        tg.look = -side
        return false
      }
      case 'path': {
        if (f.ph >= 90) return f.pt > 0.3
        if (f.landed && f.n > 0) {
          const stone = s.pieces[f.n - 1]
          if (stone) stone.sq.value = 0.8
          snd.drop('pebble', 0.55)
        }
        if (f.n < s.pieces.length) {
          if (f.pt > 0.3) {
            const stone = s.pieces[f.n]!
            hopTo(f, stone.x, stone.y - 8, 30, 0.46)
            f.n++
            f.pt = 0
          }
        } else {
          tg.sit = 1
          f.lamp = 'down'
          tg.look = Math.sin(f.t * 0.5)
          if (!f.resting && f.pt > 3.6) {
            f.ph = 90
            f.pt = 0
          }
        }
        return false
      }
      case 'bath': {
        if (!p0) return true
        if (f.ph === 0) {
          hopTo(f, s.x, s.y + 27, 44, 0.58)
          f.ph = 1
        } else if (f.ph === 1) {
          f.clip = { x: s.x, y: s.y }
          p0.wob.kick(1.6)
          p0.sq.value = 0.9
          if (p0.water) {
            snd.splash()
            fx.burst(s.x, s.y, { count: 7, color: ['#d6ecf2', '#a9cfe0'], speed: 150, life: 0.5, size: 7.4, gravity: 600, angle: -Math.PI / 2, spread: 1.5 })
          } else snd.drop('shell', 0.6)
          f.ph = 2
          f.pt = 0
          f.n = 0
        } else if (f.ph === 2) {
          const calm = f.resting && f.t > 11
          tg.sit = 0
          if (!calm) {
            const w = Math.sin(f.t * 6)
            tg.lx = 9
            tg.rx = -9
            tg.ly = -30 + w * 5
            tg.ry = -30 - w * 5
            tg.eyes = Math.sin(f.t * 1.1) > 0 ? 1 : 0
            const k = Math.floor(f.pt / 1.7)
            if (f.n <= k) {
              f.n = k + 1
              if (p0.water) {
                snd.drip()
                fx.burst(s.x + rnd(-10, 10), s.y - 14, { count: 3, color: ['#d6ecf2', '#a9cfe0'], speed: 90, life: 0.45, size: 6.3, gravity: 500, angle: -Math.PI / 2, spread: 1.8 })
              } else {
                p0.wob.kick(rnd(-1.2, 1.2))
                snd.tick()
              }
            }
          } else tg.eyes = 1
        } else if (f.ph === 90) {
          f.clip = null
          hopTo(f, s.ax, s.ay, 40, 0.55)
          f.ph = 91
        } else return true
        return false
      }
      case 'ladder': {
        const steps = 6
        if (f.ph === 0) {
          f.ph = 1
          f.pt = 0
          f.n = 0
        }
        if (f.ph === 1 || f.ph === 90) {
          const up = f.ph === 1
          const c = clamp(f.pt / (up ? 2.6 : 2), 0, 1)
          const whole = Math.floor(c * steps)
          const frac = ease.inOutQuad(c * steps - whole)
          const cs = Math.min(1, (whole + frac) / steps)
          const k = up ? cs : 1 - cs
          f.x = lerp(s.x, s.x2, k)
          f.y = lerp(s.y + 4, s.y2 + 6, k)
          const w = Math.sin(c * steps * Math.PI)
          tg.ly = -16 - w * 8
          tg.ry = -16 + w * 8
          tg.rot = clamp((s.x2 - s.x) / 300, -0.25, 0.25)
          if (f.n <= whole && c < 1) {
            f.n = whole + 1
            snd.tick()
            if (p0) p0.wob.kick(rnd(-0.4, 0.4))
          }
          if (c >= 1) {
            if (!up) return true
            f.ph = 2
            f.pt = 0
          }
        } else if (f.ph === 2) {
          tg.sit = 1
          tg.look = Math.sin(f.pt * 0.9)
          if (f.resting) f.lamp = 'held'
          else if (f.pt > 4) {
            f.ph = 90
            f.pt = 0
            f.n = 0
          }
        }
        return false
      }
      case 'beam': {
        const len = Math.max(30, dist(s.x, s.y, s.x2, s.y2))
        const reach = f.resting ? 0.5 : 1
        if (f.ph === 0) {
          hopTo(f, s.x, s.y - 6, 24, 0.44)
          f.ph = 1
          f.n = 0
        } else if (f.ph === 1) {
          const c = Math.min(reach, (f.pt * 46) / len)
          f.x = lerp(s.x, s.x2, c)
          f.y = lerp(s.y, s.y2, c) - 6
          tg.rot = Math.sin(f.pt * 5) * 0.11
          tg.lx = -10
          tg.rx = 10
          tg.ly = -9 + Math.sin(f.pt * 5) * 4
          tg.ry = -9 - Math.sin(f.pt * 5) * 4
          f.pose.step += dt * 9
          const k = Math.floor(f.pt / 0.55)
          if (f.n <= k) {
            f.n = k + 1
            snd.tick()
            if (p0) p0.sq.value = 0.94
          }
          if (c >= reach) {
            f.ph = f.resting ? 2 : 90
            f.pt = 0
          }
        } else if (f.ph === 2) {
          tg.sit = 1
          f.lamp = 'held'
          tg.look = Math.sin(f.t * 0.5)
          if (!f.resting) f.ph = 90
        } else if (f.ph === 90) {
          hopTo(f, clamp(f.x + 34, 40, W - 40), Math.min(f.y + 24, 786), 22, 0.42)
          f.ph = 91
        } else return true
        return false
      }
      case 'roof': {
        if (f.ph >= 90) return f.pt > 0.3
        if (f.pt < 1.2 && p0 && !p0.lampOn) {
          tg.ly = -26
          tg.ry = -26
          tg.look = s.x2 < s.x ? -1 : 1
          if (f.pt > 0.75) {
            p0.lampOn = true
            snd.chime(3, 0.045)
          }
        } else {
          tg.sit = 1
          tg.eyes = f.resting && f.t > 12 ? 1 : 0
        }
        return false
      }
      case 'deck': {
        if (f.ph === 0) {
          hopTo(f, s.x, s.y, 24, 0.44)
          f.ph = 1
          f.n = 0
          f.pt = 0
        } else if (f.ph === 1) {
          if (f.landed && p0) {
            p0.sq.value = 0.9
            snd.drop('bark', 0.5)
          }
          if (f.n < 3 && f.pt > 0.45) {
            hopTo(f, f.x + 22, f.y, 15, 0.32)
            f.n++
            f.pt = 0
          } else if (f.n >= 3) {
            tg.sit = 1
            f.lamp = 'down'
            tg.look = Math.sin(f.t * 0.6)
          }
        } else if (f.ph === 90) {
          hopTo(f, f.x, Math.min(f.y + 30, 786), 20, 0.4)
          f.ph = 91
        } else return true
        return false
      }
      case 'feather': {
        if (!p0) return true
        if (f.ph >= 90) {
          if (p0.carried === f) {
            p0.carried = null
            p0.sq.value = 0.9
            p0.wob.kick(1.4)
            snd.drop('feather')
          }
          return f.pt > 0.4
        }
        if (f.pt > 0.5 && !p0.carried) {
          p0.carried = f
          snd.pick('feather')
        }
        if (p0.carried === f) {
          tg.rx = 5
          tg.ry = -22
          tg.look = Math.sin(f.t * 1.2)
          tg.rot = Math.sin(f.t * 1.6) * 0.08
        }
        return false
      }
      case 'inside':
      case 'door': {
        if (f.ph >= 90) return f.pt > 0.3
        if (f.ph === 0) {
          hopTo(f, s.x, s.y, 16, 0.42)
          f.ph = 1
        } else {
          tg.sit = 1
          f.lamp = 'down'
          tg.eyes = s.kind === 'inside' && f.resting && f.t > 9 ? 1 : 0
          tg.look = Math.sin(f.t * 0.45 + f.i)
        }
        return false
      }
    }
  }

  const updateFolk = (f: Folk, dt: number) => {
    f.t += dt
    f.landed = false
    const tg = f.tg
    tg.rot = 0
    tg.eyes = 0
    tg.sit = 0
    tg.lx = tg.ly = tg.rx = tg.ry = 0
    tg.look = 0
    let vx = 0

    if (f.hop) {
      const h = f.hop
      h.t = Math.min(1, h.t + dt / h.dur)
      f.x = lerp(h.x0, h.x1, h.t)
      f.y = lerp(h.y0, h.y1, h.t) - Math.sin(h.t * Math.PI) * h.h
      vx = (h.x1 - h.x0) / h.dur
      if (h.t >= 1) {
        f.hop = null
        f.landed = true
        f.sq.value = 0.8
      }
    }

    if (f.mode === 'wait') {
      if (f.t >= 0) {
        f.mode = 'fly'
        f.t = 0
        f.fromX = f.x
        f.fromY = f.y
      }
    } else if (f.mode === 'fly') {
      const c = clamp(f.t / 4.4, 0, 1)
      const e = ease.inOutQuad(c)
      f.alpha = Math.min(1, f.alpha + dt * 1.2)
      f.x = lerp(f.fromX, f.landX, e) + Math.sin(c * 9 + f.i * 2) * 26 * (1 - c)
      f.y = lerp(f.fromY, f.landY, e) - Math.sin(c * Math.PI) * 70 + Math.sin(c * 13 + f.i) * 10 * (1 - c)
      if (Math.random() < dt * 5) fx.burst(f.x, f.y - 34, { count: 1, color: ['#ffe9a6', '#fff6cf'], speed: 16, life: 0.9, size: 6.3, gravity: 30, drag: 0.95 })
      if (c >= 1) {
        f.mode = 'pop'
        f.t = 0
        f.sq.value = 0.6
        snd.chime([0, 2, 4][f.i] ?? 0, 0.07)
        fx.burst(f.x, f.y - 30, { count: 6, color: ['#ffe9a6', '#fff6cf'], speed: 60, life: 0.7, size: 6.3, gravity: 20, drag: 0.93 })
      }
    } else if (f.mode === 'pop') {
      f.form = ease.outBack(clamp(f.t / 0.55, 0, 1))
      if (f.t >= 0.9) {
        f.form = 1
        f.mode = 'idle'
      }
    } else if (f.mode === 'idle') {
      const s = choose(f)
      if (s) {
        s.taken = f
        f.spot = s
        f.mode = 'walk'
        f.t = 0
      } else tg.look = Math.sin(f.t * 1.1)
    } else if (f.mode === 'walk' && f.spot) {
      const s = f.spot
      const d = dist(f.x, f.y, s.ax, s.ay)
      const step = 84 * dt
      if (d <= step + 1) {
        f.x = s.ax
        f.y = s.ay
        f.mode = 'act'
        f.t = 0
        f.ph = 0
        f.pt = 0
        f.n = 0
      } else {
        vx = ((s.ax - f.x) / d) * 84
        f.x += vx * dt
        f.y += ((s.ay - f.y) / d) * step
        f.pose.step += dt * 11
        tg.look = clamp(vx / 60, -1, 1)
      }
    } else if (f.mode === 'act' && f.spot) {
      if (act(f, f.spot, dt)) {
        f.spot.used = true
        f.spot.taken = null
        for (const p of f.spot.pieces) p.glint = 0
        f.spot = null
        f.lamp = 'none'
        f.clip = null
        f.mode = 'idle'
      }
    } else if (f.mode === 'fade') {
      f.form = 1 - ease.inCubic(clamp(f.t / 0.5, 0, 1))
      if (f.t >= 0.5) {
        f.form = 0
        f.mode = 'leave'
        f.t = 0
        f.fromX = f.x
        f.fromY = f.y
      }
    } else if (f.mode === 'leave') {
      const c = clamp(f.t / 4.2, 0, 1)
      const e = ease.inOutQuad(c)
      if (Math.random() < dt * 6) fx.burst(f.x, f.y - 34, { count: 1, color: ['#ffd97a', '#fff6cf'], speed: 16, life: 0.9, size: 6.3, gravity: 30, drag: 0.95 })
      f.x = lerp(f.fromX, f.homeX, e) + Math.sin(c * 8 + f.i) * 20 * c * (1 - c) * 4
      f.y = lerp(f.fromY, f.homeY, e) - Math.sin(c * Math.PI) * 60
      f.alpha = 1 - clamp((c - 0.75) / 0.25, 0, 1)
      if (c >= 1) {
        f.mode = 'away'
        f.alpha = 0
      }
    }

    // The body follows what it is asked for, softly.
    const p = f.pose
    const k = 1 - Math.exp(-8 * dt)
    p.rot += (tg.rot - p.rot) * k
    p.eyes += (tg.eyes - p.eyes) * k
    p.sit += (tg.sit - p.sit) * k
    p.lx += (tg.lx - p.lx) * k
    p.ly += (tg.ly - p.ly) * k
    p.rx += (tg.rx - p.rx) * k
    p.ry += (tg.ry - p.ry) * k
    p.look += (tg.look - p.look) * k
    f.vx = vx
    f.sq.update(dt)
    f.hat.target = clamp(-vx / 160, -0.8, 0.8) + Math.sin(stage.time * 0.9 + f.i * 2) * 0.12
    f.hat.update(dt)
    p.hat = f.hat.value
    f.bob = f.mode === 'walk' ? Math.abs(Math.sin(p.step)) * 4 : 0
    const asleep = p.eyes > 0.5 ? Math.sin(stage.time * 1.4 + f.i) * 0.035 : 0
    p.stretch = f.sq.value + asleep
    p.size = f.form
    f.lampGlow = damp(f.lampGlow, f.lamp === 'none' || f.form < 0.9 ? 0 : 1, 5, dt)
  }

  // ---------------------------------------------------------------- small life

  const flies: Fly[] = []
  for (let i = 0; i < 24; i++) {
    flies.push({ x: 0, y: 0, ax: rnd(40, W - 40), ay: rnd(420, 640), hx: 0, hy: 0, tx: 0, ty: 0, follow: 0, p1: rnd(0, TAU), p2: rnd(0, TAU), w1: rnd(0.25, 0.6), w2: rnd(0.3, 0.7), r: rnd(18, 46), a: 0, delay: 0 })
  }
  const stars: [number, number, number][] = []
  for (let i = 0; i < 46; i++) stars.push([stage.rand() * W, 20 + stage.rand() * 290, stage.rand() * TAU])
  const sprigAt: [number, number][] = [
    [352, 96],
    [520, 150],
    [908, 158],
    [1090, 110],
  ]
  const shrooms = MUSHROOMS.map(() => spring(0, 90, 5))
  const dapples: [number, number, number][] = [
    [520, 660, 190],
    [770, 700, 230],
    [250, 690, 200],
    [640, 470, 170],
    [1010, 660, 180],
  ]
  let nextBird = 4
  let nextCricket = 3
  let nextOwl = 14
  let nextGlint = 7

  const empty = (p: Pointer) => {
    const { x, y } = p
    for (let i = 0; i < MUSHROOMS.length; i++) {
      const m = MUSHROOMS[i]!
      if (dist(x, y, m.x, m.y - 30 * m.s) < 52 * m.s + 14) {
        shrooms[i]!.kick(x < m.x ? 2.2 : -2.2)
        sfx.tone({ freq: 196 * (i === 0 ? 1 : 1.5), to: 150 * (i === 0 ? 1 : 1.5), dur: 0.2, vol: 0.07 })
        fx.burst(m.x, m.y - 50 * m.s, { count: 4, color: ['#fbf3e4'], speed: 40, life: 0.8, size: 5.2, gravity: 60, drag: 0.94 })
        return
      }
    }
    if (inPuddle(x, y, 6)) return
    if (inHollow(x, y)) {
      snd.hollow()
      fx.burst(x, y, { count: 5, color: ['#c9a678', '#e8d3a8'], speed: 26, life: 1.1, size: 5.2, gravity: -14, drag: 0.95 })
      return
    }
    const mt = moundTop(x)
    if (y < 190 && x > 280) {
      snd.rustle()
      fx.burst(x, y + 20, { count: 3, color: ['#6b9844', '#8cb356', '#c99a4a'], speed: 50, life: 2.2, size: 14.7, gravity: 70, drag: 0.9, shape: 'square', angle: Math.PI / 2, spread: 2 })
      sprigKick = 1
      return
    }
    if (Number.isFinite(mt) && y < floorBack(x) && (y >= mt || (x > 560 && x < 848))) {
      snd.wood()
      fx.burst(x, y, { count: 6, color: ['#dcc698', '#c4a274', '#ecdcb6'], speed: 190, life: 0.55, size: 9, gravity: 520, drag: 0.93 })
      return
    }
    if (y >= floorBack(x) - 4) {
      snd.earth()
      fx.burst(x, y, { count: 8, color: ['#ecdcb6', '#dcc698', '#d3a64e', '#b4cc74'], speed: 240, life: 0.6, size: 11, gravity: 620, angle: -Math.PI / 2, spread: 2.2, drag: 0.94 })
      return
    }
    snd.air()
    fx.burst(x, y, { count: 4, color: ['#fffaf0'], speed: 24, life: 1.6, size: 5.2, gravity: -10, drag: 0.96 })
  }
  let sprigKick = 0
  let warmed = false

  // ---------------------------------------------------------------- drawing

  const drawSky = (g: G, d: number) => {
    const q = Math.round(d * 200)
    if (!skyGrad || q !== skyFor) {
      skyFor = q
      const t = q / 200
      const top = t > 0.45 ? mix(SKY.goldTop, SKY.dayTop, (t - 0.45) / 0.55) : mix(SKY.duskTop, SKY.goldTop, t / 0.45)
      const low = t > 0.45 ? mix(SKY.goldLow, SKY.dayLow, (t - 0.45) / 0.55) : mix(SKY.duskLow, SKY.goldLow, t / 0.45)
      skyGrad = g.createLinearGradient(0, 0, 0, 400)
      skyGrad.addColorStop(0, top)
      skyGrad.addColorStop(1, low)
    }
    g.fillStyle = skyGrad
    g.fillRect(0, 0, W, 430)
  }

  const drawPiece = (g: G, p: Piece, n: number) => {
    const s = art.pieces[p.kind][p.v]!
    let x = p.x
    let y = p.y
    let rot = p.angle + p.wob.value * 0.12 + p.tilt
    if (p.carried) {
      const f = p.carried
      x = f.x + 26 + f.pose.rx
      y = f.y - 74
      rot = -1.25 + Math.sin(stage.time * 1.6) * 0.3
    } else {
      // A soft shadow that slips away as the piece lifts.
      const sh = 0.2 * (1 - p.lift * 0.5) * (1 - n * 0.4)
      g.save()
      g.translate(x + p.lift * 8, y + THICK[p.kind] * 0.55 + p.lift * 22)
      g.rotate(rot)
      g.beginPath()
      g.ellipse(0, 0, HALF[p.kind] * 0.96, THICK[p.kind] * 0.7, 0, 0, TAU)
      g.fillStyle = `rgba(40,26,14,${sh})`
      g.fill()
      g.restore()
    }
    const lift = 1 + p.lift * 0.07
    const sq = p.sq.value
    drawSprite(g, s, x, y - p.lift * 16, rot, lift * (2 - sq), lift * sq, n)
    if (p.level > 0.02 && (p.kind === 'shell' || p.kind === 'acorn')) {
      g.save()
      g.translate(x, y - p.lift * 16)
      g.rotate(rot)
      g.globalAlpha = Math.min(1, p.level)
      const wx = p.kind === 'shell' ? APERTURE.x : 0
      const wy = p.kind === 'shell' ? APERTURE.y + 2 : -5.6
      const wrx = (p.kind === 'shell' ? APERTURE.rx - 6 : 20) * (0.6 + 0.4 * p.level)
      const wry = (p.kind === 'shell' ? APERTURE.ry - 5.5 : 6) * (0.6 + 0.4 * p.level)
      g.beginPath()
      g.ellipse(wx, wy, wrx, wry, p.kind === 'shell' ? -0.12 : 0, 0, TAU)
      g.fillStyle = n > 0.5 ? '#5f7fa8' : '#a9d0e2'
      g.fill()
      g.beginPath()
      g.ellipse(wx - wrx * 0.25, wy - wry * 0.2, wrx * 0.4, wry * 0.3, -0.2, Math.PI, TAU)
      g.strokeStyle = 'rgba(255,255,255,0.7)'
      g.lineWidth = 1.6
      g.stroke()
      g.restore()
    }
  }

  const glowAt = (g: G, x: number, y: number, size: number, alpha: number) => {
    if (alpha <= 0.01) return
    g.globalAlpha = Math.min(1, alpha)
    g.drawImage(art.glow, x - size / 2, y - size / 2, size, size)
  }

  const drawFolkAll = (g: G) => {
    order.sort((a, b) => a.y - b.y)
    for (const f of order) {
      if (f.alpha <= 0.01) continue
      const orbX = f.x + Math.sin(f.pose.rot) * 36
      const orbY = f.y - Math.cos(f.pose.rot) * 36
      g.globalCompositeOperation = 'lighter'
      glowAt(g, orbX, orbY, 150 + 90 * f.form, f.alpha * (0.75 - 0.3 * f.form))
      if (f.form < 0.98) glowAt(g, orbX, orbY, 44, f.alpha * (1 - f.form))
      g.globalCompositeOperation = 'source-over'
      if (f.form < 0.98) {
        glowAt(g, orbX, orbY, 84, f.alpha * (1 - f.form))
        g.globalAlpha = f.alpha * (1 - f.form)
        g.beginPath()
        g.arc(orbX, orbY, 7, 0, TAU)
        g.fillStyle = '#ffd97a'
        g.fill()
        g.beginPath()
        g.arc(orbX, orbY, 4.2, 0, TAU)
        g.fillStyle = '#fffbe6'
        g.fill()
      }
      g.globalAlpha = 1
      if (f.form > 0.02) {
        if (f.clip) {
          g.save()
          g.beginPath()
          g.rect(f.clip.x - 200, f.clip.y - 300, 400, 300)
          g.ellipse(f.clip.x, f.clip.y + 1, APERTURE.rx - 5, APERTURE.ry - 4.5, -0.12, 0, TAU)
          g.clip()
        }
        drawFolk(g, f.look, f.x, f.y - f.bob, f.pose)
        if (f.clip) g.restore()
        if (f.lampGlow > 0.02) {
          const side = f.x < CX ? 1 : -1
          const lx = f.lamp === 'held' ? f.x + side * 24 : f.x + side * 34
          const ly = f.lamp === 'held' ? f.y - 52 : f.y - 22
          g.globalAlpha = f.lampGlow
          drawLantern(g, lx, ly, 1)
          g.globalCompositeOperation = 'lighter'
          glowAt(g, lx, ly + 14, 170, 0.6 * f.lampGlow * (0.92 + 0.08 * Math.sin(stage.time * 3 + f.i)))
          g.globalCompositeOperation = 'source-over'
          g.globalAlpha = 1
        }
      }
    }
    g.globalAlpha = 1
  }

  // ---------------------------------------------------------------- the game

  return {
    update(dt) {
      const t = stage.time

      // The sun settles when it is let go low.
      let sunHeld = false
      for (const h of holds.values()) if (h.kind === 'sun') sunHeld = true
      if (!sunHeld && (night || sunY > crest - 6)) sunY = damp(sunY, SUN.set, 3, dt)
      sunSq.update(dt)
      if (!night && sunY > crest + 12) startNight()
      else if (night && sunY < crest - 26) startMorning()
      if (night) nightT += dt
      const d = dayAmt()

      for (const p of pieces) {
        if (p.held) {
          p.lift = damp(p.lift, 1, 14, dt)
          p.x = damp(p.x, p.tx, 30, dt)
          p.y = damp(p.y, p.ty, 30, dt)
          p.angle = damp(p.angle, p.rest, 9, dt)
        } else {
          p.lift = damp(p.lift, 0, 12, dt)
          if (p.fallY !== null) {
            p.vy += 2400 * dt
            p.y += p.vy * dt
            if (p.y >= p.fallY) {
              p.y = p.fallY
              p.fallY = null
              land(p, 1.2)
            }
          }
          p.angle = damp(p.angle, p.rest, 10, dt)
        }
        p.wob.update(dt)
        p.sq.update(dt)
        p.level = damp(p.level, p.water ? 1 : 0, 5, dt)
        p.tilt = damp(p.tilt, p.tiltTo, 6, dt)
        p.lamp = damp(p.lamp, p.lampOn ? 1 : 0, 4, dt)
        if (p.glint > 0) p.glint = Math.max(0, p.glint - dt)
      }

      for (const [id, h] of holds) {
        // A held thing swings a little from the fingers, like a thing with weight.
        if (h.kind === 'piece') {
          const px = stage.pointers.get(id)?.x ?? h.lx
          h.vx = damp(h.vx, (px - h.lx) / Math.max(dt, 0.001), 10, dt)
          h.lx = px
          // It already leans the way it will rest, and swings a little with the hand.
          h.piece.zone = zoneAt(h.piece.x, h.piece.y)
          h.piece.rest = restAngle(h.piece) + clamp(h.vx * 0.0007, -0.5, 0.5)
        }
        if (h.kind !== 'water') continue
        h.drip -= dt
        if (h.drip <= 0) {
          h.drip = 0.28
          fx.burst(h.x, h.y - 16, { count: 1, color: ['#a9d0e2'], speed: 8, life: 0.5, size: 8.4, gravity: 700 })
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i]!.t += dt
        if (ripples[i]!.t > 1.4) ripples.splice(i, 1)
      }
      for (let i = wet.length - 1; i >= 0; i--) {
        wet[i]!.t += dt
        if (wet[i]!.t > 9) wet.splice(i, 1)
      }
      for (let i = marks.length - 1; i >= 0; i--) {
        marks[i]!.t += dt
        if (marks[i]!.t > 0.6) marks.splice(i, 1)
      }

      let inside = 0
      for (const f of folk) {
        if (f.mode !== 'away') updateFolk(f, dt)
        if (f.spot && f.mode === 'act' && f.spot.kind === 'inside' && f.ph >= 1) inside++
      }
      hollowGlow = damp(hollowGlow, night && inside > 0 ? 1 : 0, 2, dt)
      // Something new was built while everyone rests: the nearest one gets up to try it.
      if (night && folk.every((f) => f.mode === 'act' && f.resting)) {
        const fresh = spots.find((s) => !s.used && !s.taken && !fixed(s.kind))
        if (fresh) {
          let who = folk[0]!
          for (const f of folk) if (dist(f.x, f.y, fresh.ax, fresh.ay) < dist(who.x, who.y, fresh.ax, fresh.ay)) who = f
          who.resting = false
        }
      }

      // Fireflies come out one by one and gather round the house.
      for (const fl of flies) {
        const want = night && nightT > fl.delay ? 1 : 0
        fl.a = damp(fl.a, want, want ? 0.8 : 2.5, dt)
        if (fl.a < 0.01) continue
        if (fl.follow > 0) fl.follow -= dt
        const gx = fl.follow > 0 ? fl.tx : fl.hx
        const gy = fl.follow > 0 ? fl.ty : fl.hy
        const rate = fl.follow > 0 ? 1.4 : 0.22
        fl.ax = damp(fl.ax, gx, rate, dt)
        fl.ay = damp(fl.ay, gy, rate, dt)
        fl.x = fl.ax + Math.cos(t * fl.w1 + fl.p1) * fl.r
        fl.y = fl.ay + Math.sin(t * fl.w2 + fl.p2) * fl.r * 0.6
      }

      for (const sp of shrooms) sp.update(dt)
      sprigKick = damp(sprigKick, 0, 1.5, dt)

      // Quiet company: a bird now and then by day, crickets and an owl at dusk.
      if (touched) {
        if (!night && d > 0.6) {
          nextBird -= dt
          if (nextBird <= 0) {
            nextBird = rnd(8, 17)
            snd.bird()
          }
        }
        if (night) {
          nextCricket -= dt
          if (nextCricket <= 0) {
            nextCricket = rnd(2.6, 6)
            snd.cricket()
          }
          nextOwl -= dt
          if (nextOwl <= 0) {
            nextOwl = rnd(26, 44)
            snd.owl()
          }
        }
      }
      // When the hand has been still a while, a gathered thing catches the light.
      if (!night && t - lastTouch > 6) {
        nextGlint -= dt
        if (nextGlint <= 0) {
          nextGlint = rnd(4.5, 7)
          const waiting = pieces.filter((p) => !p.placed)
          const p = waiting[Math.floor(Math.random() * waiting.length)]
          if (p) {
            p.glint = 2.2
            p.wob.kick(rnd(-0.9, 0.9))
          }
        }
      }
    },

    draw(g) {
      const t = stage.time
      const d = dayAmt()
      const n = 1 - d

      // The dusk pictures are first needed all at once when the sun goes
      // down. Showing them to the canvas now keeps that moment smooth.
      if (!warmed) {
        warmed = true
        g.globalAlpha = 0.004
        g.drawImage(art.fgNight, 0, 0, 8, 8)
        g.drawImage(art.sunDusk, 0, 0, 4, 4)
        g.drawImage(art.glow, 0, 0, 4, 4)
        for (const list of [...Object.values(art.pieces), art.sprigs, [art.mushroom]]) for (const sp of list) g.drawImage(sp.night, 0, 0, 4, 4)
        g.globalAlpha = 1
      }

      drawSky(g, d)
      if (n > 0.3) {
        g.fillStyle = '#fff6dc'
        const a = ((n - 0.3) / 0.7) ** 2
        for (const [x, y, ph] of stars) {
          g.globalAlpha = a * (0.45 + 0.4 * Math.sin(t * 1.3 + ph))
          g.fillRect(x, y, 2.4, 2.4)
        }
        g.globalAlpha = 1
      }
      // Clouds drift.
      g.globalAlpha = 0.12 + 0.7 * d
      const c1 = ((t * 5 + 380) % (W + 400)) - 360
      g.drawImage(art.cloud, c1, 150, 320, 120)
      g.drawImage(art.cloud, ((t * 3.2 + 900) % (W + 400)) - 360, 232, 250, 94)
      g.globalAlpha = 1

      // The sun, and the glow it leaves on the hill.
      const sx = SUN.x
      g.globalAlpha = 0.5 + 0.3 * n
      const gs = 380 + 240 * n
      g.drawImage(art.glow, sx - gs / 2, sunY - gs / 2, gs, gs)
      g.globalAlpha = 1
      const breathe = 1 + Math.sin(t * 0.9) * 0.02
      if (d > 0.05) {
        g.save()
        g.translate(sx, sunY)
        g.rotate(t * 0.05)
        g.globalAlpha = d * 0.9
        const rs = 280 * breathe * (1 + Math.sin(t * 0.7) * 0.03)
        g.drawImage(art.rays, -rs / 2, -rs / 2, rs, rs)
        g.restore()
        g.globalAlpha = 1
      }
      const ss = 150 * breathe
      const sq = sunSq.value
      g.save()
      g.translate(sx, sunY)
      g.scale(2 - sq, sq)
      const warm = clamp((0.75 - d) / 0.5, 0, 1)
      if (warm < 0.99) g.drawImage(art.sunDay, -ss / 2, -ss / 2, ss, ss)
      if (warm > 0.01) {
        g.globalAlpha = warm
        g.drawImage(art.sunDusk, -ss / 2, -ss / 2, ss, ss)
        g.globalAlpha = 1
      }
      g.restore()

      // The wood, the tree and the floor.
      if (n < 0.99) g.drawImage(art.fgDay, 0, 0, W, H)
      if (n > 0.01) {
        g.globalAlpha = n
        g.drawImage(art.fgNight, 0, 0, W, H)
        g.globalAlpha = 1
      }
      // Evening gold over everything while the sun is low.
      const gold = Math.sin(clamp(d, 0, 1) * Math.PI) ** 2 * (1 - d) * 1.6
      if (gold > 0.01) {
        g.fillStyle = `rgba(255,150,70,${Math.min(0.2, gold * 0.2)})`
        g.fillRect(0, 0, W, H)
      }

      // Patches of sun through the leaves.
      if (d > 0.05) {
        for (let i = 0; i < dapples.length; i++) {
          const [x, y, size] = dapples[i]!
          g.globalAlpha = d * (0.55 + 0.25 * Math.sin(t * 0.33 + i * 1.9))
          const w = size * (1 + 0.06 * Math.sin(t * 0.21 + i))
          g.drawImage(art.dapple, x + Math.sin(t * 0.17 + i * 2.3) * 26 - w / 2, y - w * 0.22, w, w * 0.44)
        }
        g.globalAlpha = 1
      }

      // Ripples on the puddle, wet marks where water was spilled.
      for (const w of wet) {
        g.globalAlpha = 0.28 * (1 - w.t / 9)
        g.beginPath()
        g.ellipse(w.x, w.y, 30, 11, 0, 0, TAU)
        g.fillStyle = '#3c2a1a'
        g.fill()
      }
      g.lineWidth = 2
      for (const rp of ripples) {
        const k = rp.t / 1.4
        g.globalAlpha = 0.55 * (1 - k)
        g.strokeStyle = '#ffffff'
        g.beginPath()
        g.ellipse(clamp(rp.x, PUDDLE.x - 40, PUDDLE.x + 40), clamp(rp.y, PUDDLE.y - 8, PUDDLE.y + 8), 10 + k * 40, (10 + k * 40) * 0.36, 0, 0, TAU)
        g.stroke()
      }
      g.globalAlpha = 1

      for (let i = 0; i < MUSHROOMS.length; i++) {
        const m = MUSHROOMS[i]!
        drawSprite(g, art.mushroom, m.x, m.y, shrooms[i]!.value * 0.1 + Math.sin(t * 0.6 + i) * 0.012, m.s, m.s, n, 0.5, 0.917)
      }

      // The gathered things, in the order they were last put down.
      let carried: Piece | null = null
      for (const p of pieces) {
        if (p.carried) carried = p
        else if (!p.held) drawPiece(g, p, n)
      }
      for (const p of pieces) if (p.held) drawPiece(g, p, n)
      for (const p of pieces) {
        if (p.glint <= 0) continue
        const k = Math.sin((p.glint / 2.2) * Math.PI)
        g.globalAlpha = 0.55 * k * d
        g.drawImage(art.dapple, p.x - 70, p.y - 44, 140, 80)
      }
      g.globalAlpha = 1

      // Where a finger has just touched: a soft patch of light.
      for (const m of marks) {
        const k = m.t / 0.6
        const size = 150 + 110 * ease.outCubic(k)
        g.globalAlpha = 1 - k
        g.drawImage(art.touch, m.x - size / 2, m.y - size / 2, size, size)
      }
      g.globalAlpha = 1

      // Water carried on a fingertip.
      for (const h of holds.values()) {
        if (h.kind !== 'water') continue
        const wob = Math.sin(t * 9) * 1.5
        g.save()
        g.translate(h.x, h.y - 44)
        g.scale(1.5, 1.5)
        g.beginPath()
        g.moveTo(0, -26)
        g.bezierCurveTo(6, -14, 17 + wob, -2, 16, 6)
        g.bezierCurveTo(15, 20, -15, 20, -16, 6)
        g.bezierCurveTo(-17 - wob, -2, -6, -14, 0, -26)
        g.fillStyle = 'rgba(150,204,228,0.92)'
        g.fill()
        g.beginPath()
        g.ellipse(-6, 2, 4, 6.5, 0.4, 0, TAU)
        g.fillStyle = 'rgba(255,255,255,0.75)'
        g.fill()
        g.restore()
      }

      // Lights in the dusk.
      if (n > 0.02) {
        g.globalCompositeOperation = 'lighter'
        if (hollowGlow > 0.01) {
          glowAt(g, HOLLOW.x, 520, 420, 0.55 * hollowGlow)
          glowAt(g, KNOT.x, KNOT.y, 110, 0.6 * hollowGlow)
        }
        for (const p of pieces) {
          if (p.lamp > 0.02) glowAt(g, lampX(p), lampY(p) + 14, 230, 0.6 * p.lamp * (0.93 + 0.07 * Math.sin(t * 2.6 + p.x)))
        }
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
        if (hollowGlow > 0.01) {
          g.globalAlpha = hollowGlow
          g.beginPath()
          g.ellipse(KNOT.x, KNOT.y + 1, KNOT.rx - 1, KNOT.ry - 1, 0.1, 0, TAU)
          g.fillStyle = '#ffd98a'
          g.fill()
          g.globalAlpha = 1
        }
        for (const p of pieces) {
          if (p.lamp > 0.02) {
            g.globalAlpha = p.lamp
            drawLantern(g, lampX(p), lampY(p), 1)
            g.globalAlpha = 1
          }
        }
      }

      drawFolkAll(g)
      if (carried) drawPiece(g, carried, n * 0.4)

      // Leaves stir above everything.
      for (let i = 0; i < sprigAt.length; i++) {
        const [x, y] = sprigAt[i]!
        const sway = Math.sin(t * 0.5 + i * 1.7) * 0.045 + Math.sin(t * 0.23 + i) * 0.03 + Math.sin(t * 7 + i) * 0.03 * sprigKick
        drawSprite(g, art.sprigs[i % art.sprigs.length]!, x, y, sway, 1, 1, n, 0.5, 0)
      }

      // A butterfly by day.
      if (d > 0.5) {
        const bx = 262 + Math.sin(t * 0.11) * 200 + Math.sin(t * 0.9) * 14
        const by = 500 + Math.sin(t * 0.17 + 1) * 64 + Math.sin(t * 1.3) * 9
        const flap = Math.abs(Math.sin(t * 6.5))
        g.globalAlpha = clamp((d - 0.5) * 3, 0, 1)
        g.fillStyle = '#f4cf63'
        for (const side of [-1, 1]) {
          g.beginPath()
          g.ellipse(bx + side * 6.5 * flap, by - 2, 7.5 * flap + 1, 9, side * 0.45, 0, TAU)
          g.fill()
        }
        g.fillStyle = '#5a3d28'
        g.fillRect(bx - 1, by - 7, 2, 12)
        g.globalAlpha = 1
      }

      // Fireflies.
      if (n > 0.3) {
        g.globalCompositeOperation = 'lighter'
        for (const fl of flies) {
          if (fl.a < 0.02) continue
          const pulse = 0.55 + 0.45 * Math.sin(t * 2.1 + fl.p1 * 3)
          g.globalAlpha = fl.a * pulse * n
          g.drawImage(art.glow, fl.x - 15, fl.y - 15, 30, 30)
        }
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      }
    },

    down(p: Pointer) {
      lastTouch = stage.time
      touched = true
      marks.push({ x: p.x, y: p.y, t: 0 })
      // The sun first: it is the one thing that turns the day.
      if (dist(p.x, p.y, SUN.x, Math.min(sunY, crest - 10)) < 96) {
        holds.set(p.id, { kind: 'sun', oy: sunY - p.y })
        sunSq.value = 0.9
        snd.chime(4 - levelOf(sunY), 0.07)
        return
      }
      if (night) {
        for (const f of folk) {
          if (f.form > 0.9 && dist(p.x, p.y, f.x + Math.sin(f.pose.rot) * 40, f.y - Math.cos(f.pose.rot) * 40) < 48) {
            f.sq.value = 0.82
            f.hat.kick(p.x < f.x ? 3 : -3)
            snd.chime(f.i * 2 + 1, 0.05)
            return
          }
        }
        // The fireflies come to see.
        const near = [...flies].sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y)).slice(0, 6)
        for (const fl of near) {
          fl.follow = 4
          fl.tx = p.x + rnd(-30, 30)
          fl.ty = p.y + rnd(-44, -6)
        }
      }
      const piece = pieceAt(p.x, p.y)
      if (piece) {
        const at = pieces.indexOf(piece)
        pieces.splice(at, 1)
        pieces.push(piece)
        piece.held = true
        piece.fallY = null
        piece.glint = 0
        piece.tx = piece.x
        piece.ty = piece.y
        piece.sq.value = 1.1
        piece.wob.kick(p.x < piece.x ? 1.6 : -1.6)
        holds.set(p.id, { kind: 'piece', piece, ox: piece.x - p.x, oy: piece.y - p.y, lx: p.x, vx: 0, x0: piece.x, y0: piece.y })
        if (night) disturb(piece)
        snd.pick(piece.kind)
        return
      }
      if (inPuddle(p.x, p.y, 10)) {
        holds.set(p.id, { kind: 'water', x: p.x, y: p.y, drip: 0.3 })
        ripples.push({ x: p.x, y: p.y, t: 0 })
        snd.plop(0)
        return
      }
      empty(p)
    },

    move(p: Pointer) {
      const h = holds.get(p.id)
      if (!h) return
      lastTouch = stage.time
      if (h.kind === 'sun') {
        sunY = clamp(p.y + h.oy, SUN.top - 14, SUN.set)
        const level = levelOf(sunY)
        if (level !== sunLevel) {
          sunLevel = level
          snd.chime(4 - level, 0.075)
        }
      } else if (h.kind === 'piece') {
        h.piece.tx = clamp(p.x + h.ox, 30, W - 30)
        h.piece.ty = clamp(p.y + h.oy, 40, 790)
      } else {
        h.x = p.x
        h.y = p.y
      }
    },

    up(p: Pointer) {
      const h = holds.get(p.id)
      if (!h) return
      holds.delete(p.id)
      if (h.kind === 'sun') {
        sunSq.value = 1.06
        return
      }
      if (h.kind === 'piece') {
        h.piece.held = false
        h.piece.x = h.piece.tx
        h.piece.y = h.piece.ty
        // A touch is not building; carrying it somewhere is.
        const was = h.piece.placed
        settle(h.piece)
        h.piece.placed = was || dist(h.piece.x, h.piece.y, h.x0, h.y0) > 28
        return
      }
      // Water: into a shell or a cap if one is under the finger, else onto the ground.
      let target: Piece | null = null
      let best = 74
      for (const q of pieces) {
        if (q.kind !== 'shell' && q.kind !== 'acorn') continue
        const qx = q.kind === 'shell' ? q.x + APERTURE.x : q.x
        const dq = dist(h.x, h.y, qx, q.y)
        if (dq < best) {
          best = dq
          target = q
        }
      }
      if (target) {
        if (target.water) snd.drip()
        fill(target)
        target.sq.value = 0.92
        fx.burst(target.x, target.y - 10, { count: 4, color: ['#d6ecf2', '#a9cfe0'], speed: 80, life: 0.4, size: 6.3, gravity: 500, angle: -Math.PI / 2, spread: 1.6 })
      } else if (inPuddle(h.x, h.y, 10)) {
        ripples.push({ x: h.x, y: h.y, t: 0 })
        snd.drip()
      } else {
        snd.splash()
        const gy = Math.max(h.y, floorBack(h.x) + 10)
        fx.burst(h.x, h.y, { count: 7, color: ['#d6ecf2', '#a9cfe0'], speed: 120, life: 0.5, size: 7.4, gravity: 700, angle: -Math.PI / 2, spread: 2.2 })
        wet.push({ x: h.x, y: Math.min(gy, 790), t: 0 })
      }
    },
  }

  function lampX(p: Piece): number {
    const c = Math.cos(p.angle) * (HALF.bark - 12)
    const s = Math.sin(p.angle) * (HALF.bark - 12)
    return p.x + (s > 0 ? -c : c)
  }
  function lampY(p: Piece): number {
    const s = Math.sin(p.angle) * (HALF.bark - 12)
    return p.y - Math.abs(s) + 16
  }
}

export const proto: Proto = {
  meta: {
    key: 'fairy-house',
    name: 'Fairy House',
    emoji: '🍄',
    ages: [3, 7],
    pitch: 'Build a little home in the roots of a tree from bark, twigs, moss and pebbles, then pull the evening down and watch small folk move in.',
    howTo: 'Drag the gathered things to build. Carry water from the puddle. Drag the sun below the hill for dusk, and back up for morning.',
    basedOn: 'Waldorf nature play and fairy houses built outdoors from found materials; the nature table; open-ended loose parts',
    whyFun: 'Bark, moss and pebbles have weight in the hand and stay where they are put; then someone small climbs your ladder and sleeps in your leaf bed.',
    set: 'gentle',
  },
  create,
}
