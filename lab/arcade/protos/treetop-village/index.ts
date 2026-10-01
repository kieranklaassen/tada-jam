// Treetop Village: a cut-paper shadow box of a great oak. The child carries
// planks, twig ladders, rope bridges, round doors, strings of acorn lanterns,
// a swing and a bucket on a rope up into the tree, and the tree folk come out
// to use exactly the ways that were made. Drag the sun behind the hill and the box is lit from
// inside by every lantern that was hung; lift the sun and it is morning.

import { TAU, clamp, damp, dist, ease, lerp, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { ELVES, drawElf, drawOwl, drawSquirrel } from './folk.ts'
import type { Pose, SquirrelPose } from './folk.ts'
import { M, buildPaper, drawLayer, leafPath, tone } from './paper.ts'
import { BRIDGES, DOOR_R, GROUND, HOLLOWS, HOOKS, HW, LADDERS, LIMBS, OWL_PERCH, PEEKS, POST, SEATS, STUBS, SUN, TRUNK, bridgeEnds, groundTop, ridgeTop, limbAt, limbTop, postTop, trunkHalf } from './world.ts'
import type { Pt } from './world.ts'

type G = CanvasRenderingContext2D
type Kind = 'plank' | 'ladder' | 'bridge' | 'door' | 'string' | 'swing' | 'bucket'

const CREST = ridgeTop(SUN.x)
const SUN_SET = CREST + 24
// A lantern string is a little chain of points; lanterns hang from some.
const N = 13
const LANTERNS = [2, 4, 6, 8, 10]
const LADDER_LEN = 150
const SWING_LEN = 84

const WOOD = '#e2bd82'
const WOOD_D = '#c39a60'
const WOOD_L = '#f2dbac'
const TWIG = '#b98d5c'
const TWIG_D = '#96693f'
const ROPE = '#8b6b48'
const CAP = '#8a5c3a'
const VELLUM = '#f6ebcb'
const LAMP = '#ffd67a'
const SHADE = 'rgba(36,26,18,0.2)'
const DOORS = ['#c25a40', '#4f858c']
const LEAF_COLS = ['#5b8c4a', '#86b35c', '#9cc267', '#6d9d52', '#e2b84e']

interface Rope {
  px: number[]
  py: number[]
  ox: number[]
  oy: number[]
  // What each end is tied to (-1 nothing), and where a hand is holding it.
  tie: [number, number]
  hand: [Pt | null, Pt | null]
  seg: number
  // How bright each lantern is, and whether it is meant to be burning.
  glow: number[]
  burn: boolean[]
  // A hand pulling the middle.
  tug: { i: number; at: Pt } | null
}

interface Piece {
  id: number
  kind: Kind
  // 'ground' lying at the foot of the tree, 'held' in the hand, 'fall'
  // drifting back down, 'set' fitted in the tree.
  state: 'ground' | 'held' | 'fall' | 'set'
  x: number
  y: number
  rot: number
  restY: number
  restRot: number
  slot: number
  // 0..1 since it was fitted: posts rise, a bridge unrolls.
  grow: number
  flip: boolean
  bob: Spring
  tilt: Spring
  hue: number
  fallT: number
  // A swing's angle and speed; a door's opening.
  ang: number
  angV: number
  open: number
  openWant: number
  // Someone on a bridge: how much weight and where along it.
  load: number
  loadU: number
  ends: [number, number, number, number]
  rope: Rope | null
}

type Step =
  | { k: 'walk'; x: number }
  | { k: 'climb'; p: Piece; up: boolean }
  | { k: 'cross'; p: Piece; fwd: boolean }
  | { k: 'emerge'; node: number; x: number }
  | { k: 'vanish' }
  | { k: 'wait'; pose: Pose; secs: number }
  | { k: 'door'; p: Piece }
  | { k: 'mount'; p: Piece }
  | { k: 'haul'; p: Piece }
  | { k: 'rest'; pose: Pose }

interface Elf {
  i: number
  // Out on the tree (or the meadow), as opposed to up among the leaves.
  out: boolean
  // -1 the meadow, 0.. a seat, -3 riding the swing.
  node: number
  x: number
  y: number
  face: number
  pose: Pose
  rest: Pose
  ph: number
  alpha: number
  lift: number
  steps: Step[]
  cur: Step | null
  ct: number
  idle: number
  peek: number
  peekT: number
  peekWant: number
  peekTimer: number
  hop: Spring
  sway: Spring
  ride: Piece | null
  door: Piece | null
  rung: number
  // Somewhere to go as soon as it is free (the evening gathering).
  goal: { node: number; x: number } | null
}

interface Job {
  kind: 'plank' | 'ladder' | 'bridge' | 'door' | 'swing' | 'bucket'
  p: Piece
  at: number
  until: number
}

interface Hop {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  dur: number
  then: () => void
}

interface Leaf {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  life: number
  col: string
  len: number
}

type Hold =
  | { k: 'sun'; oy: number }
  | { k: 'piece'; p: Piece; ox: number; oy: number }
  | { k: 'end'; p: Piece; end: 0 | 1 }
  | { k: 'maybe'; p: Piece; end: -1 | 0 | 1 }
  | { k: 'tug'; p: Piece }
  | { k: 'none' }

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy || 1
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1)
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t))
}

function create(stage: Stage): Game {
  const { sfx } = stage
  const S = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1))
  const paper = buildPaper(1 + Math.floor(stage.rand() * 100000), S)

  // ---------------------------------------------------------------- sound
  // The sounds of the things themselves, kept low.
  const knock = (pitch = 1, vol = 0.1, delay = 0) => {
    sfx.tone({ freq: 196 * pitch, to: 128 * pitch, dur: 0.1, type: 'triangle', vol, delay })
    sfx.noise({ dur: 0.03, vol: vol * 0.45, freq: 1700 * pitch, filter: 'bandpass', q: 1.2, delay })
  }
  const tick = (pitch = 1, vol = 0.045, delay = 0) => sfx.tone({ freq: 880 * pitch, to: 560 * pitch, dur: 0.04, type: 'triangle', vol, delay })
  const rustle = (vol = 0.045, delay = 0) => sfx.noise({ dur: 0.24, vol, freq: 5200, to: 2600, filter: 'highpass', delay })
  const creak = (vol = 0.022) => sfx.tone({ freq: 148 + rnd(-8, 8), to: 186, dur: 0.24, type: 'sawtooth', vol, attack: 0.06 })
  const chime = (step: number, vol = 0.06, delay = 0) => {
    if (delay > 0) stage.after(delay, () => sfx.note(step, 1.1, 'sine', vol))
    else sfx.note(step, 1.1, 'sine', vol)
  }
  const hoot = () => {
    sfx.tone({ freq: 392, to: 372, dur: 0.26, type: 'sine', vol: 0.05, attack: 0.05 })
    sfx.tone({ freq: 330, to: 312, dur: 0.5, type: 'sine', vol: 0.05, attack: 0.06, delay: 0.38 })
  }
  const thud = (vol = 0.07) => sfx.tone({ freq: 120, to: 70, dur: 0.12, type: 'sine', vol })

  // ---------------------------------------------------------------- the pile
  const pieces: Piece[] = []
  const add = (kind: Kind, x: number, y: number, rot: number, hue = 0): Piece => {
    const p: Piece = {
      id: pieces.length,
      kind,
      state: 'ground',
      x,
      y,
      rot,
      restY: y,
      restRot: rot,
      slot: -1,
      grow: 0,
      flip: false,
      bob: spring(0, 260, 13),
      tilt: spring(0, 200, 9),
      hue,
      fallT: 0,
      ang: 0,
      angV: 0,
      open: 0,
      openWant: 0,
      load: 0,
      loadU: 0.5,
      ends: [0, 0, 0, 0],
      rope: null,
    }
    if (kind === 'string') {
      p.rope = { px: [], py: [], ox: [], oy: [], tie: [-1, -1], hand: [null, null], seg: 16.5, glow: [0, 0, 0, 0, 0], burn: [false, false, false, false, false], tug: null }
      for (let i = 0; i < N; i++) {
        p.rope.px.push(x)
        p.rope.py.push(y)
        p.rope.ox.push(x)
        p.rope.oy.push(y)
      }
    }
    pieces.push(p)
    return p
  }
  for (let i = 0; i < 5; i++) add('plank', 152 + (stage.rand() - 0.5) * 22, 752 - i * 13, (stage.rand() - 0.5) * 0.07)
  for (let i = 0; i < 4; i++) add('ladder', 350 + (stage.rand() - 0.5) * 26, 754 - i * 15, (stage.rand() - 0.5) * 0.14)
  add('string', 462, 750, 0)
  add('string', 524, 742, 0)
  add('string', 584, 754, 0)
  add('door', 744, 734, -0.14, 0)
  add('door', 812, 738, 0.1, 1)
  add('bridge', 902, 744, 0)
  add('bridge', 964, 748, 0.5)
  add('swing', 1058, 750, 0.06)
  add('bucket', 1128, 738, 0)

  // Which plank is on which seat, and what is in each way, hollow and hook.
  const deck: (Piece | null)[] = SEATS.map(() => null)
  const setIn = (kind: Kind, slot: number): Piece | null => pieces.find((p) => p.kind === kind && p.state === 'set' && p.slot === slot) ?? null
  const bobOf = (node: number): number => (node >= 0 && deck[node] ? deck[node]!.bob.value : 0)
  // Which limb a seat is on (the trunk deck and the crow's nest are on none).
  const SEAT_LIMB = [0, 1, 2, 3, -1, 4, 5, -1]
  // Somewhere feet can be: the meadow, a deck, or a bare limb.
  const canStand = (node: number): boolean => node < 0 || !!deck[node] || SEAT_LIMB[node]! >= 0
  // The height of the footing at a place, at x along it.
  const standY = (node: number, x: number): number => {
    if (node < 0) return GROUND
    if (deck[node]) return SEATS[node]!.y + deck[node]!.bob.value
    const limb = SEAT_LIMB[node]!
    return limb >= 0 ? limbTop(LIMBS[limb]!, x) + 1 : SEATS[node]!.y + 11
  }

  // ---------------------------------------------------------------- geometry of fitted things
  const ladderAt = (slot: number): [Pt, Pt] => {
    const way = LADDERS[slot]!
    return [
      [way.bx, standY(way.lo, way.bx)],
      [way.tx, standY(way.hi, way.tx)],
    ]
  }
  const bridgeAt = (slot: number): [Pt, Pt] => {
    const way = BRIDGES[slot]!
    const [a, b] = bridgeEnds(slot)
    return [
      [a[0], a[1] + bobOf(way.a)],
      [b[0], b[1] + bobOf(way.b)],
    ]
  }
  // A point on a bridge's deck, u from its `a` end to its `b` end.
  const bridgePt = (p: Piece, u: number, lift = 0): Pt => {
    const [a, b] = bridgeAt(p.slot)
    const span = dist(a[0], a[1], b[0], b[1])
    const sag = (15 + span * 0.055 + p.bob.value) * (1 - lift * 0.3)
    const dip = p.load > 0 ? 7 * p.load * Math.max(0, 1 - Math.abs(u - p.loadU) / 0.34) : 0
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + (sag * 4 * u * (1 - u) + dip) - lift]
  }
  const swingSeat = (p: Piece): Pt => {
    const hook = HOOKS[p.slot]!
    return [hook[0] + Math.sin(p.ang) * SWING_LEN, hook[1] + Math.cos(p.ang) * SWING_LEN]
  }

  // The bucket hangs from a hook on a rope that an elf can haul in; `open` is
  // how far up it has been hauled. This is where its handle is.
  const bucketAt = (p: Piece): Pt => {
    const hook = HOOKS[p.slot]!
    const len = lerp(GROUND - 24 - hook[1], 40, p.open)
    return [hook[0] + Math.sin(p.ang) * len, hook[1] + Math.cos(p.ang) * len]
  }
  const hookTaken = (i: number): boolean => !!setIn('swing', i) || !!setIn('bucket', i)

  // Twigs and posts a string can be tied to: stubs are 0.., a post is 100 +
  // seat * 2 + (0 left, 1 right).
  const anchorPos = (a: number): Pt => {
    if (a < 100) return STUBS[a]!
    const seat = (a - 100) >> 1
    const at = postTop(seat, (a - 100) & 1 ? 1 : -1)
    return [at[0], at[1] + bobOf(seat) + 3]
  }
  const anchorOk = (a: number): boolean => a < 100 || !!deck[(a - 100) >> 1]
  const anchors = (): number[] => {
    const out: number[] = []
    for (let i = 0; i < STUBS.length; i++) out.push(i)
    for (let s = 0; s < SEATS.length; s++) if (deck[s] && deck[s]!.grow >= 1) out.push(100 + s * 2, 101 + s * 2)
    return out
  }

  // ---------------------------------------------------------------- where a carried piece would fit
  const fitFor = (p: Piece, x: number, y: number): number => {
    let best = -1
    let bestD = Infinity
    if (p.kind === 'plank') {
      for (let s = 0; s < SEATS.length; s++) {
        if (deck[s]) continue
        const d = dist(x, y, SEATS[s]!.x, SEATS[s]!.y)
        if (d < 150 && d < bestD) [best, bestD] = [s, d]
      }
    } else if (p.kind === 'ladder') {
      for (let i = 0; i < LADDERS.length; i++) {
        const way = LADDERS[i]!
        if (setIn('ladder', i) || !canStand(way.lo) || !canStand(way.hi)) continue
        const [b, t] = ladderAt(i)
        const d = segDist(x, y, b[0], b[1], t[0], t[1])
        if (d < 110 && d < bestD) [best, bestD] = [i, d]
      }
    } else if (p.kind === 'bridge') {
      for (let i = 0; i < BRIDGES.length; i++) {
        const way = BRIDGES[i]!
        if (setIn('bridge', i) || !deck[way.a] || !deck[way.b]) continue
        const [a, b] = bridgeAt(i)
        const d = segDist(x, y, a[0], a[1] + 14, b[0], b[1] + 14)
        if (d < 130 && d < bestD) [best, bestD] = [i, d]
      }
    } else if (p.kind === 'door') {
      for (let i = 0; i < HOLLOWS.length; i++) {
        if (setIn('door', i)) continue
        const d = dist(x, y, HOLLOWS[i]!.x, HOLLOWS[i]!.y)
        if (d < 120 && d < bestD) [best, bestD] = [i, d]
      }
    } else if (p.kind === 'swing' || p.kind === 'bucket') {
      for (let i = 0; i < HOOKS.length; i++) {
        if (hookTaken(i)) continue
        const d = dist(x, y, HOOKS[i]![0], HOOKS[i]![1] + 46)
        if (d < 150 && d < bestD) [best, bestD] = [i, d]
      }
    }
    return best
  }
  const fitAnchor = (x: number, y: number, not: number): number => {
    let best = -1
    let bestD = 100
    for (const a of anchors()) {
      if (a === not) continue
      const at = anchorPos(a)
      const d = dist(x, y, at[0], at[1])
      if (d < bestD) [best, bestD] = [a, d]
    }
    return best
  }

  // ---------------------------------------------------------------- small paper leaves
  const leaves: Leaf[] = []
  const shed = (x: number, y: number, count: number, spread = 40) => {
    for (let i = 0; i < count && leaves.length < 70; i++) {
      leaves.push({ x: x + rnd(-spread, spread), y: y + rnd(-14, 14), vx: rnd(-18, 18), vy: rnd(6, 26), rot: rnd(0, TAU), vr: rnd(-3, 3), life: rnd(1.6, 2.8), col: LEAF_COLS[Math.floor(Math.random() * LEAF_COLS.length)]!, len: rnd(11, 17) })
    }
  }

  // ---------------------------------------------------------------- the sun and the evening
  let sunY = SUN.top
  let night = 0
  let low = 0
  let dusk = false
  let duskT = 0
  let nextNote = 0
  let tune = 0
  let lastChime = 0
  const TUNE = [0, 2, 4, 2, 1, 2, 0, -1, -3, -1, 0, 2, 1, 0, -1, -3]

  // Lantern light, gathered once a frame: x, y, brightness, and how much it
  // throws on the sheets behind (every other lantern does, for all of them).
  const lights: number[] = []
  const litAt = (x: number, y: number): number => {
    let sum = 0
    for (let i = 0; i < lights.length; i += 4) {
      const d = dist(x, y, lights[i]!, lights[i + 1]!)
      if (d < 180) sum += (1 - d / 180) * lights[i + 2]!
    }
    return Math.min(1, sum)
  }

  // ---------------------------------------------------------------- the folk
  const elves: Elf[] = ELVES.map((_, i) => ({
    i,
    out: false,
    node: -9,
    x: 0,
    y: 0,
    face: 1,
    pose: 'stand' as Pose,
    rest: 'stand' as Pose,
    ph: rnd(0, 6),
    alpha: 1,
    lift: 0,
    steps: [],
    cur: null,
    ct: 0,
    idle: rnd(6, 10),
    peek: i === 0 ? 0 : i === 1 ? 2 : 3,
    peekT: 0,
    peekWant: 1,
    peekTimer: 1.5 + i * 1.3,
    hop: spring(0, 240, 12),
    sway: spring(0, 90, 7),
    ride: null,
    door: null,
    rung: 0,
    goal: null,
  }))
  const jobs: Job[] = []

  const nodeRange = (node: number): [number, number] => {
    if (node < 0) return [TRUNK - 340, TRUNK + 340]
    const s = SEATS[node]!
    return [s.x - HW + 18, s.x + HW - 18]
  }
  // Ways that can be walked now, as steps from one place to the next.
  const waysFrom = (node: number, skip?: Piece): { p: Piece; to: number }[] => {
    const out: { p: Piece; to: number }[] = []
    for (const p of pieces) {
      if (p.state !== 'set' || p.grow < 1 || p === skip) continue
      if (p.kind === 'ladder') {
        const way = LADDERS[p.slot]!
        if (way.lo === node) out.push({ p, to: way.hi })
        else if (way.hi === node) out.push({ p, to: way.lo })
      } else if (p.kind === 'bridge') {
        const way = BRIDGES[p.slot]!
        if (way.a === node) out.push({ p, to: way.b })
        else if (way.b === node) out.push({ p, to: way.a })
      }
    }
    return out
  }
  const findPath = (from: number, to: number, skip?: Piece): { p: Piece; to: number }[] | null => {
    if (from === to) return []
    const prev = new Map<number, { p: Piece; from: number }>()
    const queue = [from]
    const seen = new Set<number>([from])
    while (queue.length > 0) {
      const at = queue.shift()!
      for (const way of waysFrom(at, skip)) {
        if (seen.has(way.to)) continue
        seen.add(way.to)
        prev.set(way.to, { p: way.p, from: at })
        if (way.to === to) {
          const path: { p: Piece; to: number }[] = []
          let cursor = to
          while (cursor !== from) {
            const step = prev.get(cursor)!
            path.unshift({ p: step.p, to: cursor })
            cursor = step.from
          }
          return path
        }
        queue.push(way.to)
      }
    }
    return null
  }
  const along = (path: { p: Piece; to: number }[]): Step[] => {
    const steps: Step[] = []
    for (const edge of path) {
      if (edge.p.kind === 'ladder') {
        const way = LADDERS[edge.p.slot]!
        const up = edge.to === way.hi
        steps.push({ k: 'walk', x: up ? way.bx : way.tx }, { k: 'climb', p: edge.p, up })
      } else {
        const way = BRIDGES[edge.p.slot]!
        const fwd = edge.to === way.b
        steps.push({ k: 'walk', x: fwd ? SEATS[way.a]!.x + HW - 16 : SEATS[way.b]!.x - HW + 16 }, { k: 'cross', p: edge.p, fwd })
      }
    }
    return steps
  }
  const arrive = (node: number, x: number): Step[] => {
    if (node >= 0) return [{ k: 'emerge', node, x }]
    // Onto the meadow they come round the trunk.
    const side = x < TRUNK ? -1 : 1
    return [
      { k: 'emerge', node, x: TRUNK + side * (trunkHalf(GROUND) + 4) },
      { k: 'walk', x },
    ]
  }
  // How an elf gets somewhere: by the ways that were built if there are any,
  // and otherwise up through the leaves and down again.
  const route = (e: Elf, node: number, x: number, skip?: Piece): Step[] => {
    if (e.out && !e.ride && e.node >= -1) {
      if (e.node === node) return [{ k: 'walk', x }]
      const path = findPath(e.node, node, skip)
      if (path) return [...along(path), { k: 'walk', x }]
      return [{ k: 'vanish' }, ...arrive(node, x)]
    }
    if (e.out) return [{ k: 'vanish' }, ...arrive(node, x)]
    return arrive(node, x)
  }
  const isIdle = (e: Elf): boolean => e.out && !e.cur && e.steps.length === 0 && !e.ride
  const isHidden = (e: Elf): boolean => !e.out && !e.cur && e.steps.length === 0 && !e.door
  const reach = (e: Elf, node: number, skip?: Piece): number => {
    if (!isIdle(e)) return Infinity
    if (e.node === node) return 0
    const path = findPath(e.node, node, skip)
    return path ? path.length : Infinity
  }
  const someHidden = (): Elf | null => {
    const pool = elves.filter(isHidden)
    return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)]! : null
  }
  const spotOn = (node: number): number => {
    const [a, b] = nodeRange(node)
    return node < 0 ? TRUNK + rnd(-260, 260) : rnd(a + 6, b - 6)
  }

  // Someone comes to try the new thing. False means nobody is free yet.
  const answer = (job: Job): boolean => {
    const p = job.p
    if (p.state !== 'set') return true
    if (p.grow < 1) return false
    if (job.kind === 'plank') {
      const seat = p.slot
      const side = Math.random() < 0.5 ? -1 : 1
      const x = SEATS[seat]!.x + side * (HW - 28)
      let who: Elf | null = null
      let cost = Infinity
      for (const e of elves) {
        const c = reach(e, seat)
        if (c > 0 && c < cost) [who, cost] = [e, c]
      }
      who = who ?? someHidden() ?? elves.find((e) => isIdle(e) && e.node !== seat) ?? null
      if (!who) return elves.some((e) => isIdle(e) && e.node === seat)
      who.steps = [...route(who, seat, x), { k: 'rest', pose: 'sit' }]
      return true
    }
    if (job.kind === 'ladder' || job.kind === 'bridge') {
      const ladder = job.kind === 'ladder'
      const lo = ladder ? LADDERS[p.slot]!.lo : BRIDGES[p.slot]!.a
      const hi = ladder ? LADDERS[p.slot]!.hi : BRIDGES[p.slot]!.b
      const loX = ladder ? LADDERS[p.slot]!.bx : SEATS[lo]!.x + HW - 16
      const hiX = ladder ? LADDERS[p.slot]!.tx : SEATS[hi]!.x - HW + 16
      let who: Elf | null = null
      let cost = Infinity
      let fromLo = true
      for (const e of elves) {
        const a = reach(e, lo, p)
        const b = reach(e, hi, p) + 0.5
        if (a < cost) [who, cost, fromLo] = [e, a, true]
        if (b < cost) [who, cost, fromLo] = [e, b, false]
      }
      if (!who) {
        who = someHidden() ?? elves.find(isIdle) ?? null
        fromLo = true
      }
      if (!who) return false
      const start = fromLo ? lo : hi
      const end = fromLo ? hi : lo
      const use: Step = ladder ? { k: 'climb', p, up: fromLo } : { k: 'cross', p, fwd: fromLo }
      who.steps = [...route(who, start, fromLo ? loX : hiX, p), use, { k: 'walk', x: end < 0 ? (fromLo ? hiX : loX) + rnd(-60, 60) : spotOn(end) }, { k: 'wait', pose: 'look', secs: 2.4 }, { k: 'rest', pose: end < 0 ? 'stand' : 'sit' }]
      return true
    }
    if (job.kind === 'bucket') {
      // Someone stands on the limb above and hauls it up.
      if (elves.some((e) => e.cur && e.cur.k === 'haul' && e.cur.p === p)) return true
      const node = p.slot === 0 ? 2 : 3
      const x = HOOKS[p.slot]![0] + (p.slot === 0 ? 12 : -12)
      let who: Elf | null = null
      let cost = Infinity
      for (const e of elves) {
        const c = reach(e, node)
        if (c < cost) [who, cost] = [e, c]
      }
      who = who ?? someHidden() ?? elves.find(isIdle) ?? null
      if (!who) return false
      who.steps = [...route(who, node, x), { k: 'haul', p }, { k: 'rest', pose: 'sit' }]
      return true
    }
    // A door or the swing: someone slips down inside the tree to it.
    if (job.kind === 'door' && elves.some((e) => e.door === p)) return true
    if (job.kind === 'swing' && elves.some((e) => e.ride === p)) return true
    const who = someHidden() ?? elves.find(isIdle) ?? null
    if (!who) return false
    const use: Step = job.kind === 'door' ? { k: 'door', p } : { k: 'mount', p }
    who.steps = who.out ? [{ k: 'vanish' }, use] : [use]
    return true
  }

  const hide = (e: Elf) => {
    if (e.door) e.door.openWant = 0
    e.door = null
    e.ride = null
    e.steps = []
    e.goal = null
    if (e.out) {
      e.cur = { k: 'vanish' }
      e.ct = 0
      shed(e.x, e.y - 40, 3, 16)
    } else {
      e.cur = null
    }
  }

  // After something is taken out of the tree: whatever leaned on it comes
  // down, and anyone standing on it slips back into the leaves.
  const settleAll = () => {
    let changed = true
    while (changed) {
      changed = false
      for (const p of pieces) {
        if (p.state !== 'set') continue
        const loose = (p.kind === 'ladder' && (!canStand(LADDERS[p.slot]!.lo) || !canStand(LADDERS[p.slot]!.hi))) || (p.kind === 'bridge' && (!deck[BRIDGES[p.slot]!.a] || !deck[BRIDGES[p.slot]!.b]))
        if (loose) {
          const mid = p.kind === 'ladder' ? ladderAt(p.slot) : bridgeAt(p.slot)
          p.x = (mid[0][0] + mid[1][0]) / 2
          p.y = (mid[0][1] + mid[1][1]) / 2
          drop(p)
          changed = true
        }
        if (p.rope) {
          for (const end of [0, 1] as const) if (p.rope.tie[end] >= 0 && !anchorOk(p.rope.tie[end])) p.rope.tie[end] = -1
          if (p.rope.tie[0] < 0 && p.rope.tie[1] < 0 && !p.rope.hand[0] && !p.rope.hand[1]) {
            p.x = p.rope.px[0]!
            p.y = p.rope.py[0]!
            drop(p)
          }
        }
      }
    }
    for (const e of elves) {
      const s = e.cur
      const gone = (s && (s.k === 'climb' || s.k === 'cross' || s.k === 'door' || s.k === 'mount' || s.k === 'haul') && s.p.state !== 'set') || (e.ride && e.ride.state !== 'set') || (e.door && e.door.state !== 'set') || (e.out && e.node >= 0 && !canStand(e.node))
      if (gone) hide(e)
      else if (e.steps.some((st) => (st.k === 'climb' || st.k === 'cross' || st.k === 'door' || st.k === 'mount' || st.k === 'haul') && st.p.state !== 'set')) e.steps = []
    }
    if (squirrel.rope && squirrel.rope.state !== 'set') squirrelHome()
    if (owl.seat >= 0 && !deck[owl.seat]) owlFly(OWL_PERCH[0], OWL_PERCH[1], -1)
  }

  const drop = (p: Piece) => {
    if (p.kind === 'plank' && p.state === 'set') deck[p.slot] = null
    p.state = 'fall'
    p.slot = -1
    p.grow = 0
    p.fallT = 0
    p.open = 0
    p.openWant = 0
    if (p.rope) {
      p.rope.tie = [-1, -1]
      p.rope.hand = [null, null]
      p.rope.tug = null
      p.rope.burn.fill(false)
    }
  }

  // ---------------------------------------------------------------- fitting and lifting
  const lightString = (p: Piece, delay: number) => {
    const rope = p.rope!
    LANTERNS.forEach((_, k) => {
      stage.after(delay + k * 0.2, () => {
        if (!dusk || p.state !== 'set' || rope.burn[k]) return
        rope.burn[k] = true
        chime(k - 1 + (p.id % 3), 0.045)
      })
    })
  }

  const place = (p: Piece, slot: number) => {
    p.state = 'set'
    p.slot = slot
    p.grow = 0
    lastBuilt = stage.time
    if (p.kind === 'plank') {
      deck[slot] = p
      p.bob.value = -4
      p.bob.kick(140)
      knock(1, 0.1)
      knock(0.84, 0.08, 0.09)
      rustle(0.035, 0.05)
      shed(SEATS[slot]!.x, SEATS[slot]!.y - 30, 4, 60)
      jobs.push({ kind: 'plank', p, at: stage.time + 0.5, until: stage.time + 30 })
    } else if (p.kind === 'ladder') {
      p.tilt.kick(2.4)
      for (let i = 0; i < 3; i++) tick(1 + i * 0.12, 0.05, i * 0.05)
      knock(1.3, 0.06, 0.12)
      jobs.push({ kind: 'ladder', p, at: stage.time + 0.5, until: stage.time + 30 })
    } else if (p.kind === 'bridge') {
      const [a, b] = bridgeAt(slot)
      p.flip = dist(p.x, p.y, b[0], b[1]) < dist(p.x, p.y, a[0], a[1])
      p.bob.kick(60)
      for (let i = 0; i < 8; i++) tick(0.7 + (i % 3) * 0.1, 0.04, 0.08 + i * 0.1)
      creak(0.02)
      jobs.push({ kind: 'bridge', p, at: stage.time + 1.2, until: stage.time + 30 })
    } else if (p.kind === 'door') {
      p.bob.kick(50)
      knock(0.7, 0.11)
      tick(1.5, 0.04, 0.1)
      jobs.push({ kind: 'door', p, at: stage.time + 0.7, until: stage.time + 30 })
    } else if (p.kind === 'swing') {
      p.ang = clamp((p.x - HOOKS[slot]![0]) / 90, -0.7, 0.7)
      p.angV = 0
      creak(0.022)
      tick(1.2, 0.04, 0.06)
      jobs.push({ kind: 'swing', p, at: stage.time + 0.9, until: stage.time + 30 })
    } else if (p.kind === 'bucket') {
      p.ang = clamp((p.x - HOOKS[slot]![0]) / 200, -0.4, 0.4)
      p.angV = 0
      p.open = clamp(1 - (p.y - HOOKS[slot]![1] - 40) / 170, 0, 1)
      p.openWant = 0
      creak(0.022)
      knock(1.3, 0.05, 0.3)
      jobs.push({ kind: 'bucket', p, at: stage.time + 1.4, until: stage.time + 30 })
    }
  }

  const lift = (p: Piece) => {
    const was = p.kind === 'plank' ? p.slot : -1
    if (p.kind === 'swing' && p.state === 'set') [p.x, p.y] = HOOKS[p.slot]!
    if (p.kind === 'bucket' && p.state === 'set') {
      const at = bucketAt(p)
      p.x = at[0]
      p.y = at[1] + 30
    }
    if (p.kind === 'bridge' && p.state === 'set') [p.x, p.y] = bridgePt(p, 0.5)
    if (p.kind === 'ladder') {
      p.rot = Math.atan2(p.ends[3] - p.ends[1], p.ends[2] - p.ends[0])
      p.x = (p.ends[0] + p.ends[2]) / 2
      p.y = (p.ends[1] + p.ends[3]) / 2
    }
    p.state = 'held'
    p.slot = -1
    p.grow = 0
    p.open = 0
    p.openWant = 0
    if (was >= 0) deck[was] = null
    settleAll()
  }

  // ---------------------------------------------------------------- squirrel and owl
  const PERCHES: Pt[] = [
    [528, limbTop(LIMBS[0]!, 528)],
    [524, limbTop(LIMBS[2]!, 524)],
    [570, limbTop(LIMBS[4]!, 570)],
    [limbAt(LIMBS[6]!, 0.42).x + 10, limbAt(LIMBS[6]!, 0.42).y - 4],
    [limbAt(LIMBS[7]!, 0.42).x - 10, limbAt(LIMBS[7]!, 0.42).y - 4],
    [734, limbTop(LIMBS[5]!, 734)],
    [784, limbTop(LIMBS[3]!, 784)],
    [776, limbTop(LIMBS[1]!, 776)],
  ]
  const squirrel = {
    x: PERCHES[2]![0],
    y: PERCHES[2]![1],
    face: -1,
    pose: 'sit' as SquirrelPose,
    ph: 0,
    perch: 2,
    hop: null as Hop | null,
    rope: null as Piece | null,
    ropeU: 0,
    ropeDir: 1,
    idle: 7,
    flick: spring(0, 160, 8),
    rot: 0,
  }
  const squirrelHop = (x: number, y: number, then: () => void) => {
    const d = dist(squirrel.x, squirrel.y, x, y)
    squirrel.hop = { x0: squirrel.x, y0: squirrel.y, x1: x, y1: y, t: 0, dur: clamp(d / 380, 0.3, 1), then }
    squirrel.face = x >= squirrel.x ? 1 : -1
    squirrel.pose = 'run'
  }
  const squirrelHome = () => {
    squirrel.rope = null
    let best = 0
    let bestD = Infinity
    PERCHES.forEach((at, i) => {
      const d = dist(squirrel.x, squirrel.y, at[0], at[1])
      if (d < bestD) [best, bestD] = [i, d]
    })
    squirrel.perch = best
    squirrelHop(PERCHES[best]![0], PERCHES[best]![1], () => {
      squirrel.pose = dusk ? 'curl' : 'sit'
    })
  }
  const squirrelRun = (p: Piece) => {
    if (squirrel.hop || squirrel.rope || dusk) return
    const rope = p.rope!
    const near0 = dist(squirrel.x, squirrel.y, rope.px[0]!, rope.py[0]!) < dist(squirrel.x, squirrel.y, rope.px[N - 1]!, rope.py[N - 1]!)
    const at = near0 ? 0 : N - 1
    squirrelHop(rope.px[at]!, rope.py[at]!, () => {
      if (p.state !== 'set' || rope.tie[0] < 0 || rope.tie[1] < 0) return squirrelHome()
      squirrel.rope = p
      squirrel.ropeU = near0 ? 0 : 1
      squirrel.ropeDir = near0 ? 1 : -1
      squirrel.face = rope.px[N - 1]! > rope.px[0]! === near0 ? 1 : -1
    })
  }

  const owl = { x: OWL_PERCH[0], y: OWL_PERCH[1], ph: 0, wake: 0, spread: 0, seat: -1, fly: null as Hop | null, peep: 0 }
  const owlFly = (x: number, y: number, seat: number) => {
    owl.fly = { x0: owl.x, y0: owl.y, x1: x, y1: y, t: 0, dur: clamp(dist(owl.x, owl.y, x, y) / 210, 0.9, 2.6), then: () => {} }
    owl.seat = seat
  }

  // ---------------------------------------------------------------- evening and morning
  const startDusk = () => {
    dusk = true
    duskT = 0
    tune = 0
    nextNote = 5
    // Every lantern that was hung, lit one after another across the tree.
    const hung = pieces.filter((p) => p.rope && p.state === 'set').sort((a, b) => a.rope!.px[0]! - b.rope!.px[0]!)
    hung.forEach((p, k) => lightString(p, 0.7 + k * 1.1))
    // The folk gather where the light is.
    const decks: number[] = []
    for (let s = 0; s < SEATS.length; s++) if (deck[s]) decks.push(s)
    const warmth = (s: number): number => {
      let n = 0
      for (const p of hung) for (const i of LANTERNS) if (dist(p.rope!.px[i]!, p.rope!.py[i]!, SEATS[s]!.x, SEATS[s]!.y - 40) < 230) n++
      return n + (s === 4 && setIn('door', 1) ? 1.5 : 0)
    }
    decks.sort((a, b) => warmth(b) - warmth(a) || SEATS[a]!.y - SEATS[b]!.y)
    elves.forEach((e, k) => {
      if (e.ride) return
      if (e.door) {
        e.door.openWant = 0
        e.door = null
        e.cur = null
      }
      // Whatever it was about to do can wait for morning; it finishes the
      // step it is on.
      e.steps = []
      if (decks.length === 0) {
        // Nowhere built to gather: whoever is out sits where they are.
        if (e.out) e.steps = [{ k: 'rest', pose: 'sit' }]
        return
      }
      const seat = decks[[0, 0, 1][k]! % decks.length]!
      e.goal = { node: seat, x: SEATS[seat]!.x + [-46, 44, -1][k]! }
      if (!e.cur) e.steps = [{ k: 'wait', pose: 'stand', secs: 0.4 + k * 0.9 }]
    })
    if (!squirrel.hop && !squirrel.rope) squirrel.pose = 'curl'
    // The owl wakes and takes the highest post there is.
    let top = -1
    for (const s of decks) if (top < 0 || SEATS[s]!.y < SEATS[top]!.y) top = s
    stage.after(2.2, () => {
      if (!dusk) return
      if (top >= 0 && deck[top]) {
        const at = postTop(top, 1)
        owlFly(at[0], at[1] - 3, top)
      }
      stage.after(top >= 0 ? 2.8 : 0.4, () => {
        if (dusk) hoot()
      })
    })
  }
  const startMorning = () => {
    dusk = false
    for (const p of pieces) if (p.rope) p.rope.burn.fill(false)
    elves.forEach((e, k) => {
      e.goal = null
      e.idle = 2 + k * 2.2 + rnd(0, 2)
      if (isIdle(e)) e.hop.kick(-50)
    })
    if (squirrel.pose === 'curl') squirrel.pose = 'sit'
    squirrel.idle = 5
    if (owl.seat >= 0 || owl.fly) owlFly(OWL_PERCH[0], OWL_PERCH[1], -1)
    chime(2, 0.04)
    chime(4, 0.035, 0.5)
  }

  // ---------------------------------------------------------------- hands
  const holds = new Map<number, Hold>()
  let lastTouch = -10
  let lastBuilt = -10
  let hintAt = 7
  let builtCount = 0
  const view = { x: 0, y: 0, tx: 0, ty: 0 }

  const looseHit = (p: Piece, x: number, y: number): number => {
    if (p.kind === 'plank' || p.kind === 'ladder') {
      const half = p.kind === 'plank' ? HW : LADDER_LEN / 2
      const c = Math.cos(p.rot)
      const s = Math.sin(p.rot)
      const d = segDist(x, y, p.x - c * half, p.y - s * half, p.x + c * half, p.y + s * half)
      return d < 36 ? d : Infinity
    }
    const d = dist(x, y, p.x, p.y)
    return d < 46 ? d : Infinity
  }
  // What fitted thing is under the finger, and for a string, which end.
  const setHit = (x: number, y: number): { p: Piece; end: -1 | 0 | 1; tug: boolean } | null => {
    for (const p of pieces) {
      if (!p.rope || p.state !== 'set') continue
      const r = p.rope
      for (const end of [1, 0] as const) {
        const i = end === 0 ? 0 : N - 1
        if (dist(x, y, r.px[i]!, r.py[i]!) < (r.tie[end] < 0 ? 56 : 40)) return { p, end, tug: false }
      }
    }
    for (const p of pieces) {
      if (!p.rope || p.state !== 'set') continue
      for (let i = 1; i < N - 1; i++) if (dist(x, y, p.rope.px[i]!, p.rope.py[i]! + 8) < 30) return { p, end: -1, tug: true }
    }
    let best: Piece | null = null
    let bestD = Infinity
    for (const p of pieces) {
      if (p.state !== 'set' || p.rope) continue
      let d = Infinity
      if (p.kind === 'swing') {
        const seat = swingSeat(p)
        d = Math.min(dist(x, y, seat[0], seat[1]) - 20, segDist(x, y, HOOKS[p.slot]![0], HOOKS[p.slot]![1], seat[0], seat[1]))
        d = d < 30 ? d - 30 : Infinity
      } else if (p.kind === 'bucket') {
        const at = bucketAt(p)
        d = Math.min(dist(x, y, at[0], at[1] + 18) - 22, segDist(x, y, HOOKS[p.slot]![0], HOOKS[p.slot]![1], at[0], at[1]))
        d = d < 26 ? d - 26 : Infinity
      } else if (p.kind === 'ladder') {
        d = segDist(x, y, p.ends[0], p.ends[1], p.ends[2], p.ends[3])
        d = d < 28 ? d - 10 : Infinity
      } else if (p.kind === 'bridge') {
        for (let k = 0; k <= 8; k++) {
          const at = bridgePt(p, k / 8)
          d = Math.min(d, dist(x, y, at[0], at[1] - 8))
        }
        d = d < 32 ? d - 5 : Infinity
      } else if (p.kind === 'door') {
        d = dist(x, y, HOLLOWS[p.slot]!.x, HOLLOWS[p.slot]!.y)
        d = d < DOOR_R + 10 ? d : Infinity
      } else if (p.kind === 'plank') {
        const s = SEATS[p.slot]!
        d = Math.abs(x - s.x) < HW + 8 && y > s.y - 22 && y < s.y + 36 ? Math.abs(y - s.y - 6) + 6 : Infinity
      }
      if (d < bestD) [best, bestD] = [p, d]
    }
    return best ? { p: best, end: -1, tug: false } : null
  }

  // A touch on something fitted: it answers, and stays where it is.
  const nudge = (p: Piece, x: number) => {
    if (p.kind === 'plank') {
      p.bob.kick(90)
      knock(1 + (p.slot % 4) * 0.08, 0.08)
      for (const e of elves) if (e.out && e.node === p.slot) e.hop.kick(-70)
    } else if (p.kind === 'ladder') {
      p.tilt.kick(x < (p.ends[0] + p.ends[2]) / 2 ? 1.6 : -1.6)
      tick(1, 0.05)
      tick(1.2, 0.04, 0.06)
    } else if (p.kind === 'bridge') {
      p.bob.kick(110)
      creak(0.022)
      tick(0.8, 0.035, 0.05)
    } else if (p.kind === 'door') {
      knock(0.75, 0.08)
      if (p.openWant < 0.5 && !elves.some((e) => e.door === p)) jobs.push({ kind: 'door', p, at: stage.time + 0.15, until: stage.time + 4 })
      p.bob.kick(40)
    } else if (p.kind === 'swing') {
      p.angV += x < swingSeat(p)[0] ? 1.5 : -1.5
      creak(0.02)
      if (!elves.some((e) => e.ride === p) && !jobs.some((j) => j.p === p)) jobs.push({ kind: 'swing', p, at: stage.time + 0.6, until: stage.time + 6 })
    } else if (p.kind === 'bucket') {
      p.angV += x < bucketAt(p)[0] ? 0.7 : -0.7
      knock(1.4, 0.06)
      if (!jobs.some((j) => j.p === p)) jobs.push({ kind: 'bucket', p, at: stage.time + 0.3, until: stage.time + 6 })
    }
  }

  const touchFolk = (x: number, y: number): boolean => {
    for (const e of elves) {
      if (e.out && e.alpha > 0.5 && dist(x, y, e.x, e.y - 30) < 40) {
        e.hop.kick(-110)
        e.sway.kick(60)
        e.face = x < e.x ? -1 : 1
        chime(e.i * 2 + 1, 0.045)
        return true
      }
      if (!e.out && e.peek >= 0 && dist(x, y, PEEKS[e.peek]![0], PEEKS[e.peek]![1] - 10) < 62) {
        e.peekWant = e.peekT > 0.5 ? 0 : 1
        e.peekTimer = 2.5
        rustle(0.04)
        shed(PEEKS[e.peek]![0], PEEKS[e.peek]![1], 3, 30)
        return true
      }
    }
    if (dist(x, y, squirrel.x, squirrel.y - 16) < 40) {
      squirrel.flick.kick(9)
      tick(1.9, 0.04)
      tick(2.2, 0.035, 0.07)
      if (squirrel.pose === 'curl') squirrel.ph = 0
      return true
    }
    if (dist(x, y, owl.x, owl.y - 24) < 42) {
      owl.peep = 2.4
      hoot()
      return true
    }
    return false
  }

  const ambient = (x: number, y: number) => {
    if (Math.abs(x - TRUNK) < trunkHalf(y) + 6 && y > 190 && y < groundTop(x)) {
      knock(0.6 + (y / H) * 0.2, 0.07)
      shed(x, y - 120, 1, 50)
    } else if (y > groundTop(x)) {
      thud(0.05)
      sfx.noise({ dur: 0.12, vol: 0.025, freq: 3000, filter: 'highpass' })
      for (let i = 0; i < 3 && leaves.length < 70; i++) leaves.push({ x: x + rnd(-10, 10), y: y - 4, vx: rnd(-30, 30), vy: rnd(-70, -40), rot: rnd(0, TAU), vr: rnd(-4, 4), life: 0.9, col: '#8cba64', len: 9 })
    } else if (x > 176 && y < 340) {
      rustle(0.05)
      shed(x, y, 4, 34)
    } else {
      // Open sky: the nearest cloud takes a little puff of wind.
      sfx.noise({ dur: 0.3, vol: 0.02, freq: 700, to: 1400, filter: 'bandpass', q: 0.8 })
      let best = 0
      for (let i = 1; i < clouds.length; i++) if (Math.abs(clouds[i]!.x - x) < Math.abs(clouds[best]!.x - x)) best = i
      clouds[best]!.push.kick(x < clouds[best]!.x + 70 ? 40 : -40)
      if (night > 0.5) chime(6, 0.03)
    }
  }

  const clouds = [
    { x: 40, y: 190, v: 5, push: spring(0, 30, 5) },
    { x: 520, y: 330, v: 3.4, push: spring(0, 30, 5) },
    { x: 900, y: 372, v: 4.2, push: spring(0, 30, 5) },
  ]
  const flies: [number, number, number][] = []
  for (let i = 0; i < 7; i++) flies.push([110 + stage.rand() * 960, 540 + stage.rand() * 150, stage.rand() * TAU])
  const twinkles: Pt[] = []
  for (let i = 0; i < 7; i++) twinkles.push([20 + stage.rand() * 150, 30 + stage.rand() * 330])

  // ---------------------------------------------------------------- the string as a chain
  const ropeWake = (p: Piece, x: number, y: number) => {
    const r = p.rope!
    for (let i = 0; i < N; i++) {
      r.px[i] = x + Math.sin(i * 1.7) * 14
      r.py[i] = y + i * 2
      r.ox[i] = r.px[i]!
      r.oy[i] = r.py[i]!
    }
    r.seg = 16.5
  }
  const ropeStep = (p: Piece, dt: number) => {
    const r = p.rope!
    const fix: [Pt | null, Pt | null] = [r.hand[0] ?? (r.tie[0] >= 0 ? anchorPos(r.tie[0]) : null), r.hand[1] ?? (r.tie[1] >= 0 ? anchorPos(r.tie[1]) : null)]
    let want = 16.5
    if (fix[0] && fix[1]) want = Math.max(5, (dist(fix[0][0], fix[0][1], fix[1][0], fix[1][1]) * 1.09) / (N - 1))
    r.seg = damp(r.seg, want, 10, dt)
    const wind = Math.sin(stage.time * 0.7 + p.id) * 14
    for (let i = 0; i < N; i++) {
      const vx = (r.px[i]! - r.ox[i]!) * 0.982
      const vy = (r.py[i]! - r.oy[i]!) * 0.982
      r.ox[i] = r.px[i]!
      r.oy[i] = r.py[i]!
      r.px[i] = r.px[i]! + vx + wind * dt * dt
      r.py[i] = r.py[i]! + vy + 1500 * dt * dt
    }
    for (let k = 0; k < 10; k++) {
      if (fix[0]) [r.px[0], r.py[0]] = fix[0]
      if (fix[1]) [r.px[N - 1], r.py[N - 1]] = fix[1]
      if (r.tug) {
        r.px[r.tug.i] = lerp(r.px[r.tug.i]!, r.tug.at[0], 0.5)
        r.py[r.tug.i] = lerp(r.py[r.tug.i]!, r.tug.at[1], 0.5)
      }
      for (let i = 0; i < N - 1; i++) {
        const dx = r.px[i + 1]! - r.px[i]!
        const dy = r.py[i + 1]! - r.py[i]!
        const d = Math.hypot(dx, dy) || 0.001
        const pull = ((d - r.seg) / d) * 0.5
        r.px[i] = r.px[i]! + dx * pull
        r.py[i] = r.py[i]! + dy * pull
        r.px[i + 1] = r.px[i + 1]! - dx * pull
        r.py[i + 1] = r.py[i + 1]! - dy * pull
      }
    }
    if (fix[0]) [r.px[0], r.py[0]] = fix[0]
    if (fix[1]) [r.px[N - 1], r.py[N - 1]] = fix[1]
    for (let i = 0; i < N; i++) if (r.py[i]! > GROUND + 60) r.py[i] = GROUND + 60
    for (let k = 0; k < 5; k++) r.glow[k] = damp(r.glow[k]!, r.burn[k] ? 1 : 0, r.burn[k] ? 5 : 9, dt)
  }

  // ---------------------------------------------------------------- one elf, one frame
  const beginStep = (e: Elf, s: Step) => {
    if (s.k === 'emerge') {
      e.out = true
      e.node = s.node
      const [a, b] = nodeRange(s.node)
      e.x = clamp(s.x, a, b)
      e.y = standY(s.node, e.x)
      e.peek = -1
      e.alpha = 0
      e.pose = 'stand'
      rustle(0.035)
      if (s.node >= 0) shed(e.x, e.y - 70, 3, 22)
    } else if (s.k === 'door') {
      e.door = s.p
      e.peek = -1
      s.p.openWant = 1
      creak(0.02)
    } else if (s.k === 'mount') {
      e.ride = s.p
      e.out = true
      e.node = -3
      e.peek = -1
      e.alpha = 0
      e.pose = 'swing'
      rustle(0.03)
      const at = swingSeat(s.p)
      shed(at[0], at[1] - 70, 3, 20)
    } else if (s.k === 'vanish') {
      rustle(0.03)
    } else if (s.k === 'climb') {
      e.rung = 0
    } else if (s.k === 'rest') {
      e.rest = s.pose
    }
  }

  const updateElf = (e: Elf, dt: number) => {
    e.ph += dt
    e.hop.update(dt)
    const beforeX = e.x
    if (!e.cur && e.steps.length === 0 && e.goal && !e.door) {
      const goal = e.goal
      e.goal = null
      if (dusk && deck[goal.node] && !e.ride) e.steps = [...route(e, goal.node, goal.x), { k: 'rest', pose: 'sit' }]
    }
    if (!e.cur) {
      const next = e.steps.shift()
      if (next) {
        e.cur = next
        e.ct = 0
        beginStep(e, next)
      }
    }
    const s = e.cur
    e.lift = 0
    if (s) {
      e.ct += dt
      if (s.k === 'walk') {
        const [a, b] = nodeRange(e.node)
        const goal = clamp(s.x, a, b)
        const d = goal - e.x
        e.y = standY(e.node, e.x)
        if (Math.abs(d) < 1.6) {
          e.x = goal
          e.cur = null
        } else {
          e.face = d > 0 ? 1 : -1
          e.x += e.face * Math.min(Math.abs(d), 48 * dt)
          e.pose = 'walk'
        }
      } else if (s.k === 'climb') {
        const [b, t] = ladderAt(s.p.slot)
        const len = dist(b[0], b[1], t[0], t[1])
        const u = clamp(e.ct / (len / 62), 0, 1)
        const v = s.up ? u : 1 - u
        e.x = lerp(b[0], t[0], v)
        e.y = lerp(b[1], t[1], v)
        e.pose = 'climb'
        e.face = t[0] > b[0] ? 1 : -1
        const rung = Math.floor((u * len) / 17)
        if (rung !== e.rung) {
          e.rung = rung
          tick(0.8 + (s.up ? rung : 9 - rung) * 0.035, 0.022)
          s.p.tilt.kick(rung % 2 ? 0.25 : -0.25)
        }
        if (u >= 1) {
          const way = LADDERS[s.p.slot]!
          e.node = s.up ? way.hi : way.lo
          e.cur = null
          e.hop.kick(-40)
        }
      } else if (s.k === 'cross') {
        const [a, b] = bridgeAt(s.p.slot)
        const u = clamp(e.ct / (dist(a[0], a[1], b[0], b[1]) / 44), 0, 1)
        const v = s.fwd ? u : 1 - u
        s.p.load = Math.sin(u * Math.PI) ** 0.5
        s.p.loadU = v
        const at = bridgePt(s.p, v)
        e.x = at[0]
        e.y = at[1] - 3
        e.pose = 'balance'
        e.face = (b[0] > a[0]) === s.fwd ? 1 : -1
        if (Math.floor(e.ct / 0.9) !== Math.floor((e.ct - dt) / 0.9)) {
          creak(0.014)
          s.p.bob.kick(22)
        }
        if (u >= 1) {
          const way = BRIDGES[s.p.slot]!
          e.node = s.fwd ? way.b : way.a
          s.p.load = 0
          e.cur = null
        }
      } else if (s.k === 'emerge') {
        const u = clamp(e.ct / 0.5, 0, 1)
        e.alpha = Math.min(1, u * 2.2)
        e.y = standY(e.node, e.x)
        e.lift = e.node >= 0 ? (1 - ease.outCubic(u)) * 30 : 0
        if (u >= 1) {
          e.cur = null
          e.hop.kick(e.node >= 0 ? 70 : 0)
          if (e.node >= 0 && deck[e.node]) {
            deck[e.node]!.bob.kick(46)
            knock(1.5, 0.035)
          }
        }
      } else if (s.k === 'vanish') {
        const u = clamp(e.ct / 0.34, 0, 1)
        e.alpha = 1 - u
        e.lift = ease.inQuad(u) * 26
        if (u >= 1) {
          e.out = false
          e.ride = null
          e.node = -9
          e.alpha = 1
          e.cur = null
          e.peekT = 0
          e.peekTimer = rnd(1.5, 4)
        }
      } else if (s.k === 'wait') {
        e.pose = s.pose
        if (e.out && e.node >= -1) e.y = standY(e.node, e.x)
        if (e.ct >= s.secs) e.cur = null
      } else if (s.k === 'door') {
        const hole = HOLLOWS[s.p.slot]!
        e.x = hole.x + 5
        e.y = hole.y + 44
        e.pose = 'stand'
        if (e.ct > 2.6) {
          e.door = null
          e.cur = null
          const node = hole.node
          if (!dusk && node >= -1 && (node < 0 || deck[node])) {
            // Step out onto the doorstep.
            e.out = true
            e.node = node
            e.x = hole.x + 6
            e.y = standY(node, e.x)
            e.alpha = 1
            e.hop.kick(40)
            e.steps = [{ k: 'walk', x: hole.x + (Math.random() < 0.5 ? -1 : 1) * rnd(34, 58) }, { k: 'rest', pose: node < 0 ? 'stand' : 'sit' }]
            stage.after(0.9, () => {
              if (!elves.some((o) => o.door === s.p)) s.p.openWant = 0
            })
          } else {
            s.p.openWant = 0
            e.peekTimer = rnd(2, 4)
          }
        }
      } else if (s.k === 'haul') {
        // Hand over hand up, a look inside, and down again.
        const UP = 3.4
        const HOLD = 2
        const DOWN = 2.8
        e.y = standY(e.node, e.x)
        e.face = s.p.slot === 0 ? -1 : 1
        if (e.ct < UP) {
          e.pose = 'haul'
          s.p.open = Math.max(s.p.open, ease.inOutQuad(e.ct / UP))
        } else if (e.ct < UP + HOLD) {
          e.pose = 'look'
          s.p.open = 1
        } else {
          e.pose = 'haul'
          s.p.open = 1 - ease.inOutQuad(clamp((e.ct - UP - HOLD) / DOWN, 0, 1))
        }
        if (e.ct < UP || e.ct > UP + HOLD) {
          if (Math.floor(e.ct / 0.55) !== Math.floor((e.ct - dt) / 0.55)) creak(0.012)
        } else if (e.ct - dt < UP) knock(1.5, 0.04)
        if (e.ct >= UP + HOLD + DOWN) {
          s.p.open = 0
          e.cur = null
          thud(0.04)
        }
      } else if (s.k === 'mount') {
        e.alpha = Math.min(1, e.ct * 3)
        e.lift = Math.max(0, 1 - e.ct * 2.4) * 26
        if (e.ct > 0.5) {
          e.cur = null
          e.idle = rnd(24, 38)
          s.p.angV += 0.9
          creak(0.02)
        }
      } else {
        e.cur = null
      }
    }

    if (e.ride && e.ride.state === 'set') {
      const at = swingSeat(e.ride)
      e.x = at[0]
      e.y = at[1] - 2
      e.pose = 'swing'
      e.face = 1
      if (!s) {
        e.alpha = 1
        e.idle -= dusk ? 0 : dt
        if (e.idle <= 0 && e.steps.length === 0) {
          e.idle = rnd(8, 14)
          hide(e)
        }
      }
    } else if (e.out && !e.cur && e.steps.length === 0) {
      // Nothing to do: rest where it is, and by day wander now and then by
      // whatever ways there are.
      e.y = standY(e.node, e.x)
      e.pose = e.node < 0 && e.rest === 'sit' ? 'stand' : e.rest
      if (!dusk) {
        e.idle -= dt
        if (e.idle <= 0) {
          e.idle = rnd(8, 14)
          const near = waysFrom(e.node).filter((w) => canStand(w.to))
          if (near.length > 0 && Math.random() < 0.6) {
            const way = near[Math.floor(Math.random() * near.length)]!
            e.steps = [...along([way]), { k: 'walk', x: spotOn(way.to) }, { k: 'rest', pose: way.to < 0 || Math.random() < 0.3 ? 'stand' : 'sit' }]
          } else {
            e.steps = [{ k: 'walk', x: e.node < 0 ? clamp(e.x + rnd(-90, 90), TRUNK - 300, TRUNK + 300) : spotOn(e.node) }, { k: 'rest', pose: e.node < 0 || Math.random() < 0.35 ? 'stand' : 'sit' }]
          }
        }
      }
    } else if (!e.out && !e.cur && !e.door) {
      // Up in the leaves: look out now and then.
      if (e.peek < 0) {
        const free = PEEKS.map((_, i) => i).filter((i) => !elves.some((o) => o !== e && o.peek === i))
        e.peek = free[Math.floor(Math.random() * free.length)] ?? 0
        e.peekT = 0
        e.peekWant = 0
        e.peekTimer = rnd(1, 3)
      }
      e.peekTimer -= dt
      if (e.peekTimer <= 0) {
        e.peekWant = dusk ? 1 : e.peekWant > 0.5 ? 0 : 1
        e.peekTimer = e.peekWant > 0.5 ? rnd(5, 9) : rnd(2, 4)
      }
      e.peekT = damp(e.peekT, e.peekWant, 4, dt)
    }
    e.sway.target = clamp((e.x - beforeX) / Math.max(dt, 0.001) / 14, -5, 5) * e.face
    e.sway.update(dt)
  }

  // ---------------------------------------------------------------- drawing the pieces
  const strip = (g: G, x1: number, y1: number, x2: number, y2: number, w: number, col: string) => {
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.strokeStyle = col
    g.lineWidth = w
    g.stroke()
  }

  // A plank, as a deck with its posts and braces grown `grow` of the way.
  const drawPlank = (g: G, x: number, y: number, rot: number, grow: number, lit: number, alpha = 1) => {
    g.save()
    g.translate(x, y)
    if (rot) g.rotate(rot)
    if (alpha < 1) g.globalAlpha = alpha
    if (grow > 0) {
      const up = ease.outBack(clamp(grow * 1.2, 0, 1))
      for (const s of [-1, 1]) {
        const px = s * (HW - 6)
        const top = -6 - POST * up
        strip(g, px + 3, 4, px + 3, top + 10, 5, SHADE)
        strip(g, px, 0, px, top + 6, 5, tone(TWIG, night, lit))
        g.beginPath()
        g.moveTo(px - 6, top - 4)
        g.lineTo(px, top + 6)
        g.lineTo(px + 6, top - 4)
        g.strokeStyle = tone(TWIG, night, lit)
        g.lineWidth = 4
        g.stroke()
        strip(g, s * 40, 5, s * 20, 5 + 17 * Math.min(1, grow * 1.5), 5, tone(TWIG_D, night, lit))
      }
    }
    g.fillStyle = SHADE
    g.fillRect(-HW + 3, -1, HW * 2, 12)
    g.fillStyle = tone(WOOD, night, lit)
    g.fillRect(-HW, -6, HW * 2, 12)
    g.fillStyle = tone(WOOD_L, night, lit)
    g.fillRect(-HW, -6, HW * 2, 2.6)
    g.fillStyle = tone(WOOD_D, night, lit)
    g.fillRect(-28, -3.4, 1.6, 9.4)
    g.fillRect(22, -3.4, 1.6, 9.4)
    g.fillRect(-HW, 4.4, HW * 2, 1.6)
    g.restore()
  }

  const drawLadder = (g: G, x1: number, y1: number, x2: number, y2: number, lit: number, alpha = 1) => {
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const ux = (x2 - x1) / len
    const uy = (y2 - y1) / len
    const nx = -uy * 7.5
    const ny = ux * 7.5
    // The rails stand a little proud of the top.
    const ex = x2 + ux * 12
    const ey = y2 + uy * 12
    g.save()
    if (alpha < 1) g.globalAlpha = alpha
    g.beginPath()
    g.moveTo(x1 + nx + 3, y1 + ny + 5)
    g.lineTo(ex + nx + 3, ey + ny + 5)
    g.moveTo(x1 - nx + 3, y1 - ny + 5)
    g.lineTo(ex - nx + 3, ey - ny + 5)
    g.strokeStyle = SHADE
    g.lineWidth = 4.4
    g.stroke()
    g.beginPath()
    const rungs = Math.max(2, Math.floor(len / 17))
    for (let i = 0; i < rungs; i++) {
      const d = ((i + 0.6) / rungs) * len
      const wob = (i % 2 ? 1 : -1) * 1.1
      g.moveTo(x1 + ux * (d + wob) + nx, y1 + uy * (d + wob) + ny)
      g.lineTo(x1 + ux * (d - wob) - nx, y1 + uy * (d - wob) - ny)
    }
    g.strokeStyle = tone(TWIG_D, night, lit)
    g.lineWidth = 3.4
    g.stroke()
    g.beginPath()
    g.moveTo(x1 + nx, y1 + ny)
    g.lineTo(ex + nx, ey + ny)
    g.moveTo(x1 - nx, y1 - ny)
    g.lineTo(ex - nx, ey - ny)
    g.strokeStyle = tone(TWIG, night, lit)
    g.lineWidth = 4.4
    g.stroke()
    g.restore()
  }

  // A bridge laid out `grow` of the way from one end; `geom` gives its line.
  const drawBridge = (g: G, at: (u: number) => Pt, grow: number, flip: boolean, lit: number, alpha = 1) => {
    const K = 16
    const upto = Math.max(1, Math.round(K * clamp(grow, 0, 1)))
    const pt = (k: number): Pt => at(flip ? 1 - k / K : k / K)
    g.save()
    if (alpha < 1) g.globalAlpha = alpha
    // Shadow, then the rope under the slats, the slats, the hand rope.
    g.beginPath()
    for (let k = 0; k <= upto; k++) {
      const p = pt(k)
      if (k === 0) g.moveTo(p[0] + 3, p[1] + 6)
      else g.lineTo(p[0] + 3, p[1] + 6)
    }
    g.strokeStyle = SHADE
    g.lineWidth = 7
    g.stroke()
    g.beginPath()
    for (let k = 0; k <= upto; k++) {
      const p = pt(k)
      if (k === 0) g.moveTo(p[0], p[1] + 4)
      else g.lineTo(p[0], p[1] + 4)
    }
    g.strokeStyle = tone(ROPE, night, lit)
    g.lineWidth = 2.2
    g.stroke()
    g.beginPath()
    for (let k = 0; k <= upto; k++) {
      const p = pt(k)
      if (k === 0) g.moveTo(p[0], p[1])
      else g.lineTo(p[0], p[1])
    }
    g.setLineDash([9, 3.2])
    g.lineCap = 'butt'
    g.strokeStyle = tone(WOOD, night, lit)
    g.lineWidth = 6.5
    g.stroke()
    g.setLineDash([])
    g.lineCap = 'round'
    if (grow >= 1) {
      const rail = (k: number): Pt => {
        const p = pt(k)
        const u = k / K
        return [p[0], p[1] - 27 + 6 * 4 * u * (1 - u)]
      }
      g.beginPath()
      for (let k = 0; k <= K; k++) {
        const p = rail(k)
        if (k === 0) g.moveTo(p[0], p[1])
        else g.lineTo(p[0], p[1])
      }
      for (let k = 2; k < K; k += 3) {
        const a = rail(k)
        const b = pt(k)
        g.moveTo(a[0], a[1])
        g.lineTo(b[0], b[1])
      }
      g.strokeStyle = tone(ROPE, night, lit)
      g.lineWidth = 1.8
      g.stroke()
    } else {
      // What is still rolled up travels along the front.
      const p = pt(upto)
      drawRoll(g, p[0], p[1] - 10, 0, 8 + 14 * (1 - grow), lit)
    }
    g.restore()
  }

  const drawRoll = (g: G, x: number, y: number, rot: number, rad: number, lit: number) => {
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.beginPath()
    g.arc(3, 5, rad, 0, TAU)
    g.fillStyle = SHADE
    g.fill()
    g.beginPath()
    g.arc(0, 0, rad, 0, TAU)
    g.fillStyle = tone(WOOD, night, lit)
    g.fill()
    g.beginPath()
    for (let a = 0; a < TAU * 2.4; a += 0.4) {
      const r = (a / (TAU * 2.4)) * (rad - 3)
      if (a === 0) g.moveTo(0, 0)
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.strokeStyle = tone(WOOD_D, night, lit)
    g.lineWidth = 2
    g.stroke()
    g.beginPath()
    g.arc(0, 0, rad - 1, 0.4, 2.2)
    g.strokeStyle = tone(ROPE, night, lit)
    g.lineWidth = 2.2
    g.stroke()
    strip(g, rad - 2, 2, rad + 9, 9, 2.2, tone(ROPE, night, lit))
    g.restore()
  }

  const drawDoor = (g: G, x: number, y: number, rot: number, hue: number, open: number, lit: number, home: boolean, alpha = 1) => {
    const R = DOOR_R
    const col = DOORS[hue % 2]!
    g.save()
    g.translate(x, y)
    if (alpha < 1) g.globalAlpha = alpha
    if (rot) g.rotate(rot)
    if (open > 0.01) {
      // Hinged on the left.
      g.translate(-R, 0)
      g.scale(1 - open * 0.74, 1)
      g.translate(R, 0)
    }
    g.beginPath()
    g.arc(3, 5, R, 0, TAU)
    g.fillStyle = SHADE
    g.fill()
    g.beginPath()
    g.arc(0, 0, R, 0, TAU)
    g.fillStyle = tone(col, night, lit)
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = tone(hue % 2 ? '#3f7078' : '#a84a34', night, lit)
    g.fillRect(-11.5, -R, 1.8, R * 2)
    g.fillRect(10, -R, 1.8, R * 2)
    g.restore()
    // Hinges, the little window, the knob.
    g.fillStyle = tone('#5d4a3a', night, lit)
    g.fillRect(-R - 1, -15, 13, 4)
    g.fillRect(-R - 1, 11, 13, 4)
    g.beginPath()
    g.arc(0, -9, 9.5, 0, TAU)
    g.fillStyle = tone('#5d4a3a', night, lit)
    g.fill()
    g.beginPath()
    g.arc(0, -9, 7.6, 0, TAU)
    g.fillStyle = home && night > 0.02 ? tone(VELLUM, night * (1 - night), 0) : tone(VELLUM, night, lit)
    g.fill()
    if (home && night > 0.3) {
      g.globalAlpha = alpha * clamp((night - 0.3) / 0.5, 0, 1)
      g.fillStyle = LAMP
      g.fill()
      g.globalAlpha = alpha
    }
    g.fillStyle = tone('#5d4a3a', night, lit)
    g.fillRect(-0.8, -17, 1.6, 16)
    g.fillRect(-8, -9.8, 16, 1.6)
    g.beginPath()
    g.arc(16, 7, 3.2, 0, TAU)
    g.fillStyle = tone('#e3b54e', night, lit)
    g.fill()
    g.restore()
  }

  const drawLantern = (g: G, x: number, y: number, ang: number, glow: number, lit: number) => {
    g.save()
    g.translate(x, y)
    g.rotate(ang)
    strip(g, 0, 0, 0, 6, 1.4, tone(ROPE, night, lit))
    g.beginPath()
    g.arc(2, 17, 6.8, 0, TAU)
    g.fillStyle = SHADE
    g.fill()
    g.beginPath()
    g.arc(0, 15, 6.8, 0, TAU)
    g.fillStyle = tone(VELLUM, night, lit)
    g.fill()
    if (glow > 0.02) {
      g.globalAlpha = glow
      g.fillStyle = LAMP
      g.fill()
      g.beginPath()
      g.arc(0, 15.5, 3.4, 0, TAU)
      g.fillStyle = '#fff6d2'
      g.fill()
      g.globalAlpha = 1
    }
    g.beginPath()
    g.ellipse(0, 11.5, 8, 6, 0, Math.PI, TAU)
    g.fillStyle = tone(CAP, night, Math.max(lit, glow * 0.6))
    g.fill()
    g.restore()
  }

  const drawString = (g: G, p: Piece) => {
    const r = p.rope!
    g.beginPath()
    g.moveTo(r.px[0]! + 2, r.py[0]! + 4)
    for (let i = 1; i < N; i++) g.lineTo(r.px[i]! + 2, r.py[i]! + 4)
    g.strokeStyle = SHADE
    g.lineWidth = 2.4
    g.stroke()
    const lit = litAt(r.px[6]!, r.py[6]!)
    g.beginPath()
    g.moveTo(r.px[0]!, r.py[0]!)
    for (let i = 1; i < N - 1; i++) g.quadraticCurveTo(r.px[i]!, r.py[i]!, (r.px[i]! + r.px[i + 1]!) / 2, (r.py[i]! + r.py[i + 1]!) / 2)
    g.lineTo(r.px[N - 1]!, r.py[N - 1]!)
    g.strokeStyle = tone(ROPE, night, lit)
    g.lineWidth = 2.2
    g.stroke()
    LANTERNS.forEach((i, k) => drawLantern(g, r.px[i]!, r.py[i]!, clamp((r.px[i]! - r.ox[i]!) * -0.22, -0.7, 0.7), r.glow[k]!, lit))
    // A loop at each end to hold it by; a free end catches the light.
    for (const end of [0, 1] as const) {
      const i = end === 0 ? 0 : N - 1
      const free = r.tie[end] < 0 && !r.hand[end]
      g.beginPath()
      g.arc(r.px[i]!, r.py[i]! + (free ? 4 : 0), free ? 6.5 : 4, 0, TAU)
      g.strokeStyle = tone(free ? '#d9b36a' : ROPE, night, lit)
      g.lineWidth = free ? 3 : 2.2
      g.stroke()
      if (free) {
        const shine = Math.max(0, Math.sin(stage.time * 1.6 + p.id * 2)) ** 6
        if (shine > 0.02) {
          g.globalAlpha = shine * 0.8
          g.strokeStyle = '#fff6d8'
          g.lineWidth = 2
          g.beginPath()
          g.arc(r.px[i]!, r.py[i]! + 4, 6.5, -2.4, -0.6)
          g.stroke()
          g.globalAlpha = 1
        }
      }
    }
  }

  const drawCoil = (g: G, x: number, y: number, rot: number, lit: number) => {
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.scale(1.18, 1.18)
    g.lineWidth = 2.2
    for (const [dx, dy, s] of [
      [3, 5, 1],
      [0, 0, 0],
    ] as [number, number, number][]) {
      g.strokeStyle = s ? SHADE : tone(ROPE, night, lit)
      g.beginPath()
      g.ellipse(dx - 6, dy + 6, 24, 9, 0.08, 0, TAU)
      g.moveTo(dx + 30, dy + 4)
      g.ellipse(dx + 6, dy + 4, 24, 9, -0.1, 0, TAU)
      g.stroke()
    }
    const at: Pt[] = [
      [-28, -6],
      [-13, -14],
      [3, -8],
      [18, -15],
      [31, -7],
    ]
    at.forEach(([lx, ly], k) => drawLantern(g, lx, ly, (k - 2) * 0.16, 0, lit))
    g.restore()
  }

  // A swing hanging from (hx, hy) at an angle.
  const drawSwing = (g: G, hx: number, hy: number, ang: number, len: number, lit: number, alpha = 1) => {
    const sx = hx + Math.sin(ang) * len
    const sy = hy + Math.cos(ang) * len
    const cx = Math.cos(ang) * 19
    const cy = -Math.sin(ang) * 19
    g.save()
    if (alpha < 1) g.globalAlpha = alpha
    g.beginPath()
    g.moveTo(hx - 12 + 3, hy + 5)
    g.lineTo(sx - cx + 3, sy - cy + 5)
    g.moveTo(hx + 12 + 3, hy + 5)
    g.lineTo(sx + cx + 3, sy + cy + 5)
    g.strokeStyle = SHADE
    g.lineWidth = 2.2
    g.stroke()
    g.beginPath()
    g.moveTo(hx - 12, hy)
    g.lineTo(sx - cx, sy - cy)
    g.moveTo(hx + 12, hy)
    g.lineTo(sx + cx, sy + cy)
    g.strokeStyle = tone(ROPE, night, lit)
    g.stroke()
    strip(g, sx - cx * 1.25 + 3, sy - cy * 1.25 + 7, sx + cx * 1.25 + 3, sy + cy * 1.25 + 7, 6, SHADE)
    g.lineCap = 'butt'
    strip(g, sx - cx * 1.25, sy - cy * 1.25 + 2, sx + cx * 1.25, sy + cy * 1.25 + 2, 6.5, tone(WOOD, night, lit))
    g.lineCap = 'round'
    g.restore()
  }

  // A bucket of acorns hanging by its handle from (x, y).
  const drawBucket = (g: G, x: number, y: number, ang: number, lit: number) => {
    g.save()
    g.translate(x, y)
    g.rotate(-ang * 0.6)
    g.beginPath()
    g.moveTo(-10 + 3, 8 + 5)
    g.lineTo(10 + 3, 8 + 5)
    g.lineTo(8 + 3, 30 + 5)
    g.lineTo(-8 + 3, 30 + 5)
    g.closePath()
    g.fillStyle = SHADE
    g.fill()
    g.beginPath()
    g.arc(0, 9, 11, Math.PI, TAU)
    g.strokeStyle = tone(ROPE, night, lit)
    g.lineWidth = 2
    g.stroke()
    for (const [ax, ay] of [
      [-6, 7],
      [1, 5],
      [7, 7],
    ] as Pt[]) {
      g.beginPath()
      g.arc(ax, ay, 4.6, 0, TAU)
      g.fillStyle = tone('#c2925c', night, lit)
      g.fill()
      g.beginPath()
      g.arc(ax, ay - 0.5, 4.8, Math.PI * 1.05, Math.PI * 1.95)
      g.fillStyle = tone(CAP, night, lit)
      g.fill()
    }
    g.beginPath()
    g.moveTo(-12, 8)
    g.lineTo(12, 8)
    g.lineTo(9, 30)
    g.lineTo(-9, 30)
    g.closePath()
    g.fillStyle = tone(WOOD, night, lit)
    g.fill()
    g.fillStyle = tone(WOOD_D, night, lit)
    g.fillRect(-11.6, 12, 23.2, 2.4)
    g.fillRect(-9.8, 23, 19.6, 2.4)
    g.fillStyle = tone(WOOD_L, night, lit)
    g.fillRect(-12, 8, 24, 2)
    g.restore()
  }
  const drawBucketRope = (g: G, hx: number, hy: number, x: number, y: number, lit: number) => {
    strip(g, hx + 3, hy + 5, x + 3, y + 5, 2.2, SHADE)
    strip(g, hx, hy, x, y, 2.2, tone(ROPE, night, lit))
    g.beginPath()
    g.arc(hx, hy - 4, 5, 0, TAU)
    g.strokeStyle = tone(ROPE, night, lit)
    g.lineWidth = 2.2
    g.stroke()
  }

  const drawLoose = (g: G, p: Piece) => {
    const lit = night > 0.05 ? litAt(p.x, p.y) : 0
    const y = p.y - Math.abs(p.bob.value)
    const rot = p.rot + (p.state === 'ground' ? p.tilt.value * 0.6 : 0)
    if (p.kind === 'plank') {
      drawPlank(g, p.x, y, rot, 0, lit)
    } else if (p.kind === 'ladder') {
      drawLadder(g, p.ends[0], p.ends[1], p.ends[2], p.ends[3], lit)
    } else if (p.kind === 'bridge') {
      drawRoll(g, p.x, y, p.rot, 23, lit)
    } else if (p.kind === 'door') {
      drawDoor(g, p.x, y, p.rot, p.hue, 0, lit, false)
    } else if (p.kind === 'string') {
      drawCoil(g, p.x, y, p.rot, lit)
    } else if (p.kind === 'bucket') {
      if (p.state === 'held') {
        const bx = p.x + Math.sin(p.ang) * 34
        const by = p.y - 44 + Math.cos(p.ang) * 34
        strip(g, p.x, p.y - 44, bx, by, 2.2, tone(ROPE, night, lit))
        drawBucket(g, bx, by, p.ang, lit)
      } else {
        g.strokeStyle = tone(ROPE, night, lit)
        g.lineWidth = 2.2
        g.beginPath()
        g.ellipse(p.x - 22, y + 12, 12, 5, 0.1, 0, TAU)
        g.moveTo(p.x - 8, y + 9)
        g.ellipse(p.x - 20, y + 8, 12, 5, -0.15, 0, TAU)
        g.stroke()
        drawBucket(g, p.x + 4, y - 18, 0, lit)
      }
    } else if (p.kind === 'swing') {
      if (p.state === 'held') {
        drawSwing(g, p.x, p.y - 30, p.ang, 56, lit)
      } else {
        g.save()
        g.translate(p.x, y)
        g.rotate(p.rot)
        g.strokeStyle = tone(ROPE, night, lit)
        g.lineWidth = 2.2
        g.beginPath()
        g.ellipse(-12, -9, 13, 6, 0.2, 0, TAU)
        g.moveTo(26, -9)
        g.ellipse(13, -9, 13, 6, -0.2, 0, TAU)
        g.stroke()
        g.fillStyle = SHADE
        g.fillRect(-21, 1, 48, 7)
        g.fillStyle = tone(WOOD, night, lit)
        g.fillRect(-24, -4, 48, 7)
        g.fillStyle = tone(WOOD_L, night, lit)
        g.fillRect(-24, -4, 48, 2)
        g.restore()
      }
    }
  }

  // Where the piece in the hand would go: the place itself lightens.
  const drawInvite = (g: G, p: Piece) => {
    const fit = fitFor(p, p.x, p.y)
    const pulse = 0.5 + 0.5 * Math.sin(stage.time * 3)
    if (p.kind === 'plank') {
      for (let s = 0; s < SEATS.length; s++) {
        if (deck[s]) continue
        g.globalAlpha = s === fit ? 0.55 + pulse * 0.2 : 0.26
        g.fillStyle = '#fff3cf'
        g.beginPath()
        g.ellipse(SEATS[s]!.x, SEATS[s]!.y + 6, s === fit ? HW : 46, s === fit ? 9 : 6, 0, 0, TAU)
        g.fill()
      }
      g.globalAlpha = 1
    } else if (p.kind === 'ladder' && fit >= 0) {
      const [b, t] = ladderAt(fit)
      drawLadder(g, b[0], b[1], t[0], t[1], 0, 0.3 + pulse * 0.12)
    } else if (p.kind === 'bridge' && fit >= 0) {
      const ghost: Piece = { ...p, slot: fit, load: 0, bob: spring(0) }
      drawBridge(g, (u) => bridgePt(ghost, u), 1, false, 0, 0.3 + pulse * 0.12)
    } else if (p.kind === 'door') {
      for (let i = 0; i < HOLLOWS.length; i++) {
        if (setIn('door', i)) continue
        g.globalAlpha = i === fit ? 0.6 + pulse * 0.2 : 0.2
        g.strokeStyle = '#fff3cf'
        g.lineWidth = i === fit ? 5 : 3
        g.beginPath()
        g.arc(HOLLOWS[i]!.x, HOLLOWS[i]!.y, DOOR_R + 2, 0, TAU)
        g.stroke()
      }
      g.globalAlpha = 1
    } else if (p.kind === 'swing' || p.kind === 'bucket') {
      for (let i = 0; i < HOOKS.length; i++) {
        if (hookTaken(i)) continue
        if (i === fit && p.kind === 'swing') drawSwing(g, HOOKS[i]![0], HOOKS[i]![1], 0, SWING_LEN, 0, 0.3 + pulse * 0.12)
        else if (i === fit) {
          g.globalAlpha = 0.3 + pulse * 0.12
          drawBucketRope(g, HOOKS[i]![0], HOOKS[i]![1], HOOKS[i]![0], GROUND - 24, 0)
          g.globalAlpha = 1
        }
        else {
          g.globalAlpha = 0.3
          g.fillStyle = '#fff3cf'
          g.beginPath()
          g.arc(HOOKS[i]![0], HOOKS[i]![1] + 6, 9, 0, TAU)
          g.fill()
          g.globalAlpha = 1
        }
      }
    }
  }
  const drawTies = (g: G, x: number, y: number, not: number) => {
    const fit = fitAnchor(x, y, not)
    for (const a of anchors()) {
      if (a === not) continue
      const at = anchorPos(a)
      const d = dist(x, y, at[0], at[1])
      if (a !== fit && d > 300) continue
      g.globalAlpha = a === fit ? 0.85 : 0.34 * (1 - d / 300) + 0.08
      g.strokeStyle = '#fff3cf'
      g.lineWidth = a === fit ? 4 : 2.6
      g.beginPath()
      g.arc(at[0], at[1], a === fit ? 12 + Math.sin(stage.time * 5) * 1.5 : 7, 0, TAU)
      g.stroke()
    }
    g.globalAlpha = 1
  }

  // ---------------------------------------------------------------- the game
  return {
    update(dt) {
      const t = stage.time

      // The sun settles when it is let go low, and the evening follows it.
      let sunHeld = false
      for (const h of holds.values()) if (h.k === 'sun') sunHeld = true
      if (!sunHeld && sunY > CREST - 46) sunY = damp(sunY, SUN_SET, 3, dt)
      low = clamp((sunY - (CREST - 230)) / 230, 0, 1)
      const depth = clamp((sunY - (CREST - 70)) / 92, 0, 1)
      night = depth * depth * (3 - 2 * depth)
      if (!dusk && night > 0.72) startDusk()
      else if (dusk && night < 0.3) startMorning()
      if (dusk) {
        duskT += dt
        // A slow pentatonic tune, far apart, thinning out to almost nothing.
        nextNote -= dt
        if (nextNote <= 0) {
          sfx.note(TUNE[tune % TUNE.length]! - 5, 1.6, 'sine', duskT < 50 ? 0.04 : 0.025)
          tune++
          nextNote = (duskT < 50 ? rnd(2.2, 3.4) : rnd(5, 8)) + (tune % 4 === 0 ? 2.4 : 0)
        }
      }

      // The box tips a little toward the hand.
      let px = -1
      let py = 0
      for (const p of stage.pointers.values()) {
        if (p.down) [px, py] = [p.x, p.y]
      }
      view.tx = px >= 0 ? (px / W - 0.5) * 2 : Math.sin(t * 0.13) * 0.3
      view.ty = px >= 0 ? (py / H - 0.5) * 2 : Math.sin(t * 0.09 + 1) * 0.2
      view.x = damp(view.x, view.tx, 1.6, dt)
      view.y = damp(view.y, view.ty, 1.6, dt)

      // Pieces.
      for (const p of pieces) {
        p.bob.update(dt)
        p.tilt.update(dt)
        if (p.kind === 'door') p.open = damp(p.open, p.openWant, 7, dt)
        if (p.kind === 'bridge') p.load = damp(p.load, 0, 5, dt)
        if (p.state === 'fall') {
          // Paper comes down slowly, side to side.
          p.fallT += dt
          p.y += Math.min(250, 60 + p.fallT * 320) * dt
          p.x = clamp(p.x + Math.sin(p.fallT * 4.2 + p.id) * 46 * dt, 60, W - 60)
          p.rot = p.restRot + Math.sin(p.fallT * 3.6 + p.id) * 0.2
          if (p.kind === 'ladder') p.rot = damp(p.rot, p.restRot, 2, dt)
          if (p.y >= p.restY) {
            p.y = p.restY
            p.rot = p.restRot
            p.state = 'ground'
            p.bob.kick(60)
            thud(0.05)
            if (p.kind !== 'string' && p.kind !== 'bridge') knock(0.9, 0.05)
          }
        } else if (p.state === 'set') {
          const rate = p.kind === 'bridge' ? 1.15 : p.kind === 'plank' ? 2.6 : 4
          const before = p.grow
          p.grow = Math.min(1, p.grow + dt * rate)
          if (p.kind === 'plank') {
            p.x = damp(p.x, SEATS[p.slot]!.x, 18, dt)
            p.y = damp(p.y, SEATS[p.slot]!.y + 6, 18, dt)
            p.rot = damp(p.rot, 0, 16, dt)
            if (before < 1 && p.grow >= 1) tick(1.4, 0.03)
          } else if (p.kind === 'door') {
            p.x = damp(p.x, HOLLOWS[p.slot]!.x, 18, dt)
            p.y = damp(p.y, HOLLOWS[p.slot]!.y, 18, dt)
            p.rot = damp(p.rot, 0, 14, dt)
          } else if (p.kind === 'swing') {
            // A pendulum; a rider keeps it going gently.
            const rider = elves.some((e) => e.ride === p && !e.cur)
            p.angV += (-7.5 * Math.sin(p.ang) - p.angV * 0.35) * dt
            if (rider && Math.abs(p.ang) < (dusk ? 0.16 : 0.42)) p.angV += Math.sign(p.angV || 1) * 0.75 * dt
            p.ang += p.angV * dt
            if (rider && Math.abs(p.ang) < 0.02 && Math.abs(p.angV) > 0.5 && Math.random() < 0.5) creak(0.008)
          } else if (p.kind === 'bucket') {
            p.angV += (-6 * Math.sin(p.ang) - p.angV * 0.9) * dt
            p.ang += p.angV * dt
            // Let go of, it runs back down.
            if (!elves.some((e) => e.cur && e.cur.k === 'haul' && e.cur.p === p)) p.open = damp(p.open, 0, 1.8, dt)
          }
        }
        if (p.kind === 'ladder') {
          if (p.state === 'set') {
            const [b, tp] = ladderAt(p.slot)
            // A knock makes it rattle about its foot.
            const wob = p.tilt.value * 0.02
            const dx = tp[0] - b[0]
            const dy = tp[1] - b[1]
            const tx = b[0] + dx * Math.cos(wob) - dy * Math.sin(wob)
            const ty = b[1] + dx * Math.sin(wob) + dy * Math.cos(wob)
            p.ends[0] = damp(p.ends[0], b[0], 16, dt)
            p.ends[1] = damp(p.ends[1], b[1], 16, dt)
            p.ends[2] = damp(p.ends[2], tx, 16, dt)
            p.ends[3] = damp(p.ends[3], ty, 16, dt)
          } else {
            const c = (Math.cos(p.rot) * LADDER_LEN) / 2
            const s = (Math.sin(p.rot) * LADDER_LEN) / 2
            p.ends = [p.x - c, p.y - s, p.x + c, p.y + s]
          }
        }
        if (p.rope && (p.state === 'set' || p.state === 'held')) ropeStep(p, dt)
      }

      // Carried pieces follow the hand with a little weight.
      for (const [id, h] of holds) {
        const ptr = stage.pointers.get(id)
        if (!ptr) continue
        if (h.k === 'piece') {
          const p = h.p
          h.ox = damp(h.ox, 0, 6, dt)
          h.oy = damp(h.oy, p.kind === 'swing' || p.kind === 'bucket' ? 0 : -30, 6, dt)
          const nx = damp(p.x, ptr.x + h.ox, 26, dt)
          const speed = (nx - p.x) / Math.max(dt, 0.001)
          p.x = nx
          p.y = damp(p.y, ptr.y + h.oy, 26, dt)
          if (p.kind === 'ladder') p.rot = damp(p.rot, -1.22 + clamp(speed * 0.0005, -0.3, 0.3), 7, dt)
          else if (p.kind === 'swing' || p.kind === 'bucket') {
            p.angV += (-9 * Math.sin(p.ang) - p.angV * 1.6 - speed * 0.012) * dt
            p.ang = clamp(p.ang + p.angV * dt, -1.1, 1.1)
          } else p.rot = damp(p.rot, clamp(speed * 0.0007, -0.35, 0.35), 9, dt)
        } else if (h.k === 'end') {
          h.p.rope!.hand[h.end] = [ptr.x, ptr.y - 14]
        } else if (h.k === 'tug') {
          const r = h.p.rope!
          if (r.tug) r.tug.at = [ptr.x, ptr.y - 8]
        }
      }

      // Who answers what was built.
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]!
        if (job.at > t) continue
        if (answer(job) || t > job.until) {
          jobs.splice(i, 1)
          i--
        }
      }
      for (const e of elves) updateElf(e, dt)

      // The squirrel.
      squirrel.ph += dt
      squirrel.flick.update(dt)
      squirrel.rot = 0
      if (squirrel.hop) {
        const hp = squirrel.hop
        hp.t += dt / hp.dur
        const u = clamp(hp.t, 0, 1)
        squirrel.x = lerp(hp.x0, hp.x1, u)
        squirrel.y = lerp(hp.y0, hp.y1, u) - Math.sin(u * Math.PI) * (24 + Math.abs(hp.x1 - hp.x0) * 0.16)
        squirrel.rot = squirrel.face * lerp(-0.5, 0.5, u)
        if (u >= 1) {
          squirrel.hop = null
          squirrel.pose = 'sit'
          squirrel.flick.kick(6)
          tick(1.7, 0.025)
          hp.then()
        }
      } else if (squirrel.rope) {
        const p = squirrel.rope
        const r = p.rope!
        if (p.state !== 'set' || r.tie[0] < 0 || r.tie[1] < 0) squirrelHome()
        else {
          const span = dist(r.px[0]!, r.py[0]!, r.px[N - 1]!, r.py[N - 1]!)
          squirrel.ropeU += (squirrel.ropeDir * dt * 150) / Math.max(60, span)
          const f = clamp(squirrel.ropeU, 0, 1) * (N - 1)
          const i = Math.min(N - 2, Math.floor(f))
          squirrel.x = lerp(r.px[i]!, r.px[i + 1]!, f - i)
          squirrel.y = lerp(r.py[i]!, r.py[i + 1]!, f - i)
          const dx = (r.px[i + 1]! - r.px[i]!) * squirrel.ropeDir
          const dy = (r.py[i + 1]! - r.py[i]!) * squirrel.ropeDir
          squirrel.face = dx >= 0 ? 1 : -1
          squirrel.rot = squirrel.face > 0 ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx)
          squirrel.pose = 'run'
          // Its weight runs along the string.
          if (i > 0) r.py[i] = r.py[i]! + 30 * dt
          if (Math.floor(squirrel.ph * 7) !== Math.floor((squirrel.ph - dt) * 7)) tick(1.5 + Math.random() * 0.4, 0.014)
          if (squirrel.ropeU < 0 || squirrel.ropeU > 1) squirrelHome()
        }
      } else if (!dusk) {
        squirrel.idle -= dt
        if (squirrel.idle <= 0) {
          squirrel.idle = rnd(9, 16)
          const full = pieces.filter((p) => p.rope && p.state === 'set' && p.rope.tie[0] >= 0 && p.rope.tie[1] >= 0)
          if (full.length > 0 && Math.random() < 0.5) squirrelRun(full[Math.floor(Math.random() * full.length)]!)
          else {
            const next = (squirrel.perch + (Math.random() < 0.5 ? 1 : PERCHES.length - 1)) % PERCHES.length
            squirrel.perch = next
            squirrelHop(PERCHES[next]![0], PERCHES[next]![1], () => {})
          }
        } else if (Math.random() < dt * 0.25) squirrel.flick.kick(4)
      } else if (squirrel.pose === 'sit') squirrel.pose = 'curl'

      // The owl.
      owl.ph += dt
      owl.peep = Math.max(0, owl.peep - dt)
      owl.wake = damp(owl.wake, dusk || owl.peep > 0 || owl.fly ? 1 : 0, 5, dt)
      if (owl.fly) {
        const f = owl.fly
        f.t += dt / f.dur
        const u = ease.inOutQuad(clamp(f.t, 0, 1))
        owl.x = lerp(f.x0, f.x1, u)
        owl.y = lerp(f.y0, f.y1, u) - Math.sin(u * Math.PI) * 46
        owl.spread = damp(owl.spread, f.t < 0.9 ? 1 : 0, 8, dt)
        if (f.t >= 1) owl.fly = null
      } else {
        owl.spread = damp(owl.spread, 0, 8, dt)
        if (owl.seat >= 0) owl.y = postTop(owl.seat, 1)[1] - 3 + bobOf(owl.seat)
      }

      // Lights, for whatever is near a lantern or a lit window.
      lights.length = 0
      if (night > 0.05) {
        for (const p of pieces) {
          if (p.rope && p.state !== 'ground' && p.state !== 'fall') {
            LANTERNS.forEach((i, k) => {
              if (p.rope!.glow[k]! > 0.03) lights.push(p.rope!.px[i]!, p.rope!.py[i]! + 15, p.rope!.glow[k]!, k % 2 === 0 ? 1.6 : 0)
            })
          } else if (p.kind === 'door' && p.state === 'set') {
            lights.push(HOLLOWS[p.slot]!.x, HOLLOWS[p.slot]!.y - 9, 0.55 * clamp((night - 0.3) / 0.5, 0, 1), 1)
          }
        }
      }

      // Leaves in the air, clouds, and the pile stirring when nothing is touched.
      for (let i = leaves.length - 1; i >= 0; i--) {
        const l = leaves[i]!
        l.life -= dt
        l.vy = Math.min(l.vy + 70 * dt, 62)
        l.x += (l.vx + Math.sin(l.life * 5 + i) * 26) * dt
        l.y += l.vy * dt
        l.rot += l.vr * dt
        if (l.life <= 0) leaves.splice(i, 1)
      }
      if (Math.random() < dt * 0.11 && leaves.length < 8) shed(rnd(240, 1100), rnd(60, 260), 1, 10)
      for (const c of clouds) {
        c.push.update(dt)
        c.x += c.v * dt
        if (c.x > W + 60) c.x = -220
      }
      if (builtCount < 2 && night < 0.3 && holds.size === 0 && t - Math.max(lastTouch, lastBuilt) > hintAt) {
        // The top plank shifts on the pile, as if settling.
        const loose = pieces.filter((p) => p.state === 'ground' && p.kind === 'plank')
        const top = loose[loose.length - 1]
        if (top) {
          top.bob.kick(-90)
          top.tilt.kick(1.2)
        }
        hintAt += 7
      }
    },

    draw(g) {
      const vx = view.x
      const vy = view.y
      const n = night

      // The back of the box: sky paper, the sun, clouds.
      if (n < 0.995) g.drawImage(paper.skyDay, -M + vx * 10, 0)
      const gold = clamp(low * 1.5 - 0.35, 0, 1) * (1 - n)
      if (gold > 0.01) {
        g.globalAlpha = gold
        g.drawImage(paper.skyGold, -M + vx * 10, 0)
      }
      if (n > 0.01) {
        g.globalAlpha = n
        g.drawImage(paper.skyNight, -M + vx * 10, 0)
        for (let i = 0; i < twinkles.length; i++) {
          const tw = twinkles[i]!
          g.globalAlpha = n * (0.35 + 0.65 * Math.abs(Math.sin(stage.time * 0.7 + i * 2.1)))
          g.fillStyle = '#fff4d6'
          g.beginPath()
          g.arc(tw[0] + vx * 10, tw[1], 2, 0, TAU)
          g.fill()
        }
      }
      g.globalAlpha = 1
      const sx = SUN.x + vx * 9
      const sy = sunY + vy * 3
      if (n > 0.02) {
        g.globalAlpha = n * 0.8
        g.drawImage(paper.glow, sx - 250, CREST - 250, 500, 500)
        g.globalAlpha = 1
      }
      g.save()
      g.translate(sx, sy)
      g.rotate(stage.time * 0.05)
      g.globalAlpha = (1 - low * 0.5) * (1 - n)
      g.drawImage(paper.rays.day, -110, -110, 220, 220)
      g.restore()
      g.globalAlpha = 1
      drawLayer(g, paper.sun, low, sx - 70, sy - 70)
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i]!
        g.globalAlpha = 1 - n * 0.8
        drawLayer(g, paper.clouds[i]!, n, c.x + c.push.value + vx * 8.5, c.y + vy * 3)
      }
      g.globalAlpha = 1

      drawLayer(g, paper.far, n, vx * 7, vy * 2.4)
      drawLayer(g, paper.near, n, vx * 5, vy * 1.8)
      drawLayer(g, paper.canopy, n, vx * 2.4, vy * 0.9)

      // Lantern light inside the box, falling on the sheets behind the tree.
      if (lights.length > 0) {
        g.globalCompositeOperation = 'lighter'
        for (let i = 0; i < lights.length; i += 4) {
          const a = lights[i + 2]! * lights[i + 3]!
          if (a < 0.02) continue
          g.globalAlpha = Math.min(1, 0.22 * a)
          g.drawImage(paper.glow, lights[i]! - 150, lights[i + 1]! - 150, 300, 300)
        }
        g.globalAlpha = 1
        g.globalCompositeOperation = 'source-over'
      }

      drawLayer(g, paper.tree, n)
      drawLayer(g, paper.ground, n)

      // Invitations for whatever is in the hand.
      for (const h of holds.values()) {
        if (h.k === 'piece') drawInvite(g, h.p)
        else if (h.k === 'end') {
          const r = h.p.rope!
          const i = h.end === 0 ? 0 : N - 1
          drawTies(g, r.px[i]!, r.py[i]!, r.tie[h.end === 0 ? 1 : 0])
        }
      }

      // Doors, with whoever is looking out of one.
      for (const p of pieces) {
        if (p.kind !== 'door' || p.state !== 'set') continue
        const hole = HOLLOWS[p.slot]!
        if (p.open > 0.02) {
          g.save()
          g.beginPath()
          g.ellipse(hole.x, hole.y, DOOR_R - 4, DOOR_R - 2, 0, 0, TAU)
          g.clip()
          if (n > 0.05) {
            g.globalAlpha = n * 0.85
            g.fillStyle = '#f2b866'
            g.fillRect(hole.x - DOOR_R, hole.y - DOOR_R, DOOR_R * 2, DOOR_R * 2)
            g.globalAlpha = 1
          }
          const e = elves.find((o) => o.door === p)
          if (e) drawElf(g, ELVES[e.i]!, e.x, e.y + (1 - clamp(p.open * 1.4, 0, 1)) * 12, 1, 'stand', e.ph, n, 0.8, 0, clamp(p.open * 1.6, 0, 1))
          g.restore()
        }
        drawDoor(g, p.x, p.y + p.bob.value * 0.05, p.rot, p.hue, p.open, litAt(p.x, p.y), true)
      }

      // Decks, bridges, ladders, the swing.
      for (const p of pieces) if (p.kind === 'plank' && p.state === 'set') drawPlank(g, p.x, p.y + p.bob.value, p.rot, p.grow, n > 0.05 ? litAt(p.x, p.y - 20) : 0)
      for (const p of pieces) if (p.kind === 'bridge' && p.state === 'set') drawBridge(g, (u) => bridgePt(p, u), p.grow, p.flip, n > 0.05 ? litAt(...bridgePt(p, 0.5)) : 0)
      for (const p of pieces) if (p.kind === 'ladder' && p.state === 'set') drawLadder(g, p.ends[0], p.ends[1], p.ends[2], p.ends[3], n > 0.05 ? litAt((p.ends[0] + p.ends[2]) / 2, (p.ends[1] + p.ends[3]) / 2) : 0)
      for (const p of pieces) {
        if (p.kind !== 'bucket' || p.state !== 'set') continue
        const hook = HOOKS[p.slot]!
        const at = bucketAt(p)
        const lit = n > 0.05 ? litAt(at[0], at[1]) : 0
        // Whoever is hauling has the other end of the rope.
        const who = elves.find((e) => e.cur && e.cur.k === 'haul' && e.cur.p === p && e.pose === 'haul')
        if (who) strip(g, hook[0], hook[1] - 4, who.x + who.face * 11, who.y - 30, 2.2, tone(ROPE, n, lit))
        drawBucketRope(g, hook[0], hook[1], at[0], at[1], lit)
        drawBucket(g, at[0], at[1], p.ang, lit)
      }
      for (const p of pieces) if (p.kind === 'swing' && p.state === 'set') drawSwing(g, HOOKS[p.slot]![0], HOOKS[p.slot]![1], p.ang, SWING_LEN * ease.outBack(clamp(p.grow, 0, 1)), n > 0.05 ? litAt(...swingSeat(p)) : 0)

      // The folk.
      drawOwl(g, owl.x, owl.y, owl.ph, owl.wake, owl.spread, n, n > 0.05 ? litAt(owl.x, owl.y - 20) : 0)
      for (const e of elves) {
        if (e.out) {
          const kick = e.ride ? clamp(e.ride.angV * 0.5, -1, 1) : 0
          drawElf(g, ELVES[e.i]!, e.x, e.y - e.lift + Math.min(0, e.hop.value) * 0.16 + Math.max(0, e.hop.value) * 0.05, e.face, e.pose, e.ph * (dusk && e.pose === 'sit' ? 0.5 : 1), n, n > 0.05 ? litAt(e.x, e.y - 26) : 0, e.sway.value, e.alpha, kick)
        } else if (e.peek >= 0 && !e.door && e.peekT > 0.02) {
          const at = PEEKS[e.peek]!
          drawElf(g, ELVES[e.i]!, at[0] - vx * 3 + Math.sin(e.ph * 0.7) * 2, at[1] + 56 - e.peekT * 46 - vy * 1.2, at[0] < TRUNK ? 1 : -1, 'stand', e.ph, n, n > 0.05 ? Math.max(0.25, litAt(at[0], at[1])) : 0, Math.sin(e.ph * 0.9) * 1.5)
        }
      }
      drawSquirrel(g, squirrel.x, squirrel.y, squirrel.face, squirrel.pose, squirrel.ph, n, n > 0.05 ? litAt(squirrel.x, squirrel.y - 10) : 0, squirrel.flick.value, squirrel.rot)

      // Strings that are up, then the things still lying at the foot.
      for (const p of pieces) if (p.rope && p.state === 'set') drawString(g, p)
      for (const p of pieces) if (p.state === 'ground' || p.state === 'fall') drawLoose(g, p)

      // Leaves in the air.
      for (const l of leaves) {
        g.globalAlpha = Math.min(1, l.life * 2)
        g.beginPath()
        leafPath(g, l.x, l.y, l.len, l.len * 0.3, l.rot)
        g.fillStyle = tone(l.col, n)
        g.fill()
      }
      g.globalAlpha = 1

      // The front sheets: leaf clumps and the fringe along the top.
      // They stir a little, as leaves do.
      for (let i = 0; i < paper.clumps.length; i++) drawLayer(g, paper.clumps[i]!, n, -vx * 3 + Math.sin(stage.time * 0.5 + i * 1.9) * 1.6, -vy * 1.2 + Math.sin(stage.time * 0.37 + i) * 1.1)
      drawLayer(g, paper.fringe, n, -vx * 3.4 + Math.sin(stage.time * 0.31) * 2.2, -vy * 1.4 + Math.sin(stage.time * 0.43 + 1) * 1)

      // What is in the hand, over everything it might pass.
      for (const p of pieces) {
        if (p.state !== 'held') continue
        if (p.rope) drawString(g, p)
        else drawLoose(g, p)
      }
      drawLayer(g, paper.grass, n, -vx * 7, -vy * 2)

      // The lanterns' own glow, in front.
      if (lights.length > 0) {
        g.globalCompositeOperation = 'lighter'
        for (let i = 0; i < lights.length; i += 4) {
          g.globalAlpha = 0.2 * lights[i + 2]!
          g.drawImage(paper.glow, lights[i]! - 40, lights[i + 1]! - 40, 80, 80)
        }
        g.globalAlpha = 1
        g.globalCompositeOperation = 'source-over'
      }
      // A few fireflies over the meadow once it is dusk.
      if (n > 0.3) {
        g.globalCompositeOperation = 'lighter'
        const t = stage.time
        for (const f of flies) {
          const a = ((n - 0.3) / 0.7) * Math.max(0, Math.sin(t * 0.8 + f[2] * 3)) ** 2
          if (a < 0.03) continue
          g.globalAlpha = a
          const fx = f[0] + Math.sin(t * 0.23 + f[2]) * 46 + Math.sin(t * 0.61 + f[2] * 2) * 12
          const fy = f[1] + Math.cos(t * 0.19 + f[2]) * 28
          g.drawImage(paper.glow, fx - 12, fy - 12, 24, 24)
        }
        g.globalCompositeOperation = 'source-over'
      }
      g.globalAlpha = 1
      g.drawImage(paper.frame, 0, 0, W, H)
    },

    dispose() {
      // The sheets are big; give them back at once rather than when the
      // browser gets round to it.
      const sheets = [paper.far, paper.near, paper.canopy, paper.tree, paper.ground, paper.fringe, paper.grass, paper.sun, paper.rays, ...paper.clumps, ...paper.clouds]
      for (const l of sheets) {
        l.day.width = 0
        l.night.width = 0
      }
      for (const c of [paper.skyDay, paper.skyGold, paper.skyNight, paper.glow, paper.frame]) c.width = 0
    },

    down(p: Pointer) {
      lastTouch = stage.time
      hintAt = 7
      const x = p.x
      const y = p.y
      // The sun first: it is the one thing that turns the day.
      if (dist(x, y, SUN.x + view.x * 9, Math.min(sunY, CREST - 8)) < 76) {
        holds.set(p.id, { k: 'sun', oy: sunY - y })
        chime(3, 0.05)
        return
      }
      // Something lying loose (or still drifting down).
      let best: Piece | null = null
      let bestD = Infinity
      for (const piece of pieces) {
        if (piece.state !== 'ground' && piece.state !== 'fall') continue
        const d = looseHit(piece, x, y)
        if (d < Infinity && d <= bestD) [best, bestD] = [piece, d]
      }
      if (best) {
        best.state = 'held'
        best.bob.kick(-40)
        if (best.rope) {
          ropeWake(best, x, y - 14)
          best.rope.hand[0] = [x, y - 14]
          holds.set(p.id, { k: 'end', p: best, end: 0 })
          tick(1.3, 0.04)
          tick(1.6, 0.03, 0.05)
        } else {
          holds.set(p.id, { k: 'piece', p: best, ox: best.x - x, oy: best.y - y })
          if (best.kind === 'bridge' || best.kind === 'swing' || best.kind === 'bucket') creak(0.018)
          else knock(1.2, 0.07)
        }
        return
      }
      if (touchFolk(x, y)) {
        holds.set(p.id, { k: 'none' })
        return
      }
      const hit = setHit(x, y)
      if (hit) {
        if (hit.tug) {
          const r = hit.p.rope!
          let near = 1
          for (let i = 1; i < N - 1; i++) if (dist(x, y, r.px[i]!, r.py[i]!) < dist(x, y, r.px[near]!, r.py[near]!)) near = i
          r.tug = { i: near, at: [x, y - 8] }
          holds.set(p.id, { k: 'tug', p: hit.p })
          tick(1.4, 0.04)
          tick(1.7, 0.03, 0.06)
        } else if (hit.end >= 0 && hit.p.rope!.tie[hit.end as 0 | 1] < 0) {
          // A free end: take it straight away.
          hit.p.rope!.hand[hit.end as 0 | 1] = [x, y - 14]
          holds.set(p.id, { k: 'end', p: hit.p, end: hit.end as 0 | 1 })
          tick(1.3, 0.04)
        } else {
          holds.set(p.id, { k: 'maybe', p: hit.p, end: hit.end })
          if (hit.end >= 0) {
            tick(1.2, 0.04)
            const r = hit.p.rope!
            for (let i = 2; i < N - 2; i++) r.py[i] = r.py[i]! + 5
          } else nudge(hit.p, x)
        }
        return
      }
      holds.set(p.id, { k: 'none' })
      ambient(x, y)
    },

    move(p: Pointer) {
      const h = holds.get(p.id)
      if (!h) return
      lastTouch = stage.time
      if (h.k === 'sun') {
        sunY = clamp(p.y + h.oy, SUN.top - 16, SUN_SET)
        const level = Math.floor((sunY - SUN.top) / 58)
        if (level !== lastChime) {
          lastChime = level
          chime(4 - level, 0.04)
        }
      } else if (h.k === 'maybe' && dist(p.x, p.y, p.startX, p.startY) > 26) {
        const piece = h.p
        if (piece.rope) {
          const end = h.end as 0 | 1
          piece.rope.tie[end] = -1
          piece.rope.hand[end] = [p.x, p.y - 14]
          piece.rope.burn.fill(false)
          holds.set(p.id, { k: 'end', p: piece, end })
          tick(1.1, 0.04)
        } else {
          lift(piece)
          holds.set(p.id, { k: 'piece', p: piece, ox: piece.x - p.x, oy: piece.y - p.y })
          if (piece.kind === 'plank') {
            knock(1.1, 0.06)
            rustle(0.03)
          } else creak(0.018)
        }
      }
    },

    up(p: Pointer) {
      const h = holds.get(p.id)
      holds.delete(p.id)
      if (!h) return
      if (h.k === 'piece') {
        const piece = h.p
        const fit = fitFor(piece, piece.x, piece.y)
        if (fit >= 0) {
          place(piece, fit)
          builtCount++
        } else {
          piece.state = 'fall'
          piece.fallT = 0
          if (piece.y >= piece.restY - 4) piece.y = piece.restY - 4
        }
      } else if (h.k === 'end') {
        const piece = h.p
        const r = piece.rope!
        const i = h.end === 0 ? 0 : N - 1
        const other = h.end === 0 ? 1 : 0
        r.hand[h.end] = null
        const a = fitAnchor(r.px[i]!, r.py[i]!, r.tie[other])
        if (a >= 0) {
          r.tie[h.end] = a
          piece.state = 'set'
          lastBuilt = stage.time
          builtCount++
          tick(1.2, 0.05)
          tick(1.5, 0.04, 0.07)
          tick(1.8, 0.03, 0.14)
          if (r.tie[other] >= 0) stage.after(1.1, () => squirrelRun(piece))
          if (dusk) lightString(piece, 0.3)
        } else if (r.tie[other] < 0) {
          // Let go in the air with neither end tied: it drifts down and coils.
          piece.x = r.px[i]!
          piece.y = Math.min(r.py[i]!, piece.restY - 4)
          drop(piece)
        } else {
          r.burn.fill(false)
          if (dusk) lightString(piece, 0.2)
        }
      } else if (h.k === 'tug') {
        h.p.rope!.tug = null
        tick(1.5, 0.03)
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'treetop-village',
    name: 'Treetop Village',
    emoji: '🌳',
    ages: [3, 7],
    pitch: 'Carry planks, twig ladders, rope bridges, round doors and acorn lanterns up into a great paper oak, and the tree folk come out to use the ways you made.',
    howTo: 'Drag things from the foot of the tree into its branches; drag them back down to tidy. Tie a lantern string by one end, then the other. Drag the sun behind the hill for evening, and lift it for morning.',
    basedOn: 'Waldorf nature play and fairy tales: building small homes for the little folk; a cut-paper shadow box',
    whyFun: 'Each piece clicks into the tree with a wooden knock and at once someone small comes out to climb it, cross it or sit on it; at dusk only the lanterns you hung light the box.',
    set: 'gentle',
  },
  create,
}
