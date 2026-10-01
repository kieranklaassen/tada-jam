// The cut-outs: everything that moves over the painted sheet. Each is painted
// once with the same watercolour box, on its own scrap of paper (so it stays
// opaque over the scene), with a pencil outline the paint only roughly keeps to.

import { TAU } from '../../kit/math.ts'
import { makeSprite, oval, place, rng } from './paint.ts'
import type { Box, G, Pt, Sprite } from './paint.ts'

// Mirror a right-hand half outline (top to bottom) into a whole closed shape.
function mirror(half: readonly Pt[]): Pt[] {
  const left = half
    .filter((p) => p[0] !== 0)
    .map(([x, y]) => [-x, y] as Pt)
    .reverse()
  return [...half, ...left]
}

// ---------------------------------------------------------------- hulls

export interface HullDef {
  key: string
  // Drawn behind what sits in the boat (the inside), and in front (the wall).
  back: Sprite
  front: Sprite
  halfW: number
  // Where things rest inside, where the mast steps, where the gnome sits.
  deckY: number
  mastX: number
  seatX: number
  cargoFrom: number
  cargoTo: number
  // How many things it can carry.
  holds: number
  // How deep it floats, how lively it is on the water, whether it turns.
  draft: number
  bob: number
  roll: number
  spins: boolean
  // The top of the wall, for a lamp set on the bow.
  rimY: number
}

function barkHull(box: Box, S: number, seed: number, w: number, birchBark: boolean): { back: Sprite; front: Sprite } {
  const h = w / 2
  const W = w + 30
  const H = 84
  const rimL = -h
  const far: Pt[] = [
    [rimL, -40],
    [-h * 0.6, -51],
    [0, -55],
    [h * 0.6, -51],
    [h, -43],
    [h * 0.6, -36],
    [0, -32],
    [-h * 0.6, -35],
  ]
  const wall: Pt[] = [
    [rimL, -40],
    [rimL, -40],
    [-h * 0.6, -35],
    [0, -32],
    [h * 0.6, -36],
    [h, -43],
    [h, -43],
    [h * 0.9, -22],
    [h * 0.55, -5],
    [0, 0],
    [-h * 0.55, -4],
    [-h * 0.88, -18],
  ]
  const back = makeSprite(W, H, 0.5, 0.86, S, (g: G) => {
    const r = rng(seed)
    box.under(g, far)
    box.pencil(g, r, far, { closed: true, a: 0.5, jit: 1 })
    box.wash(g, r, far, { color: birchBark ? '#e2b08c' : '#e6c998', a: 0.95, pool: 0.7, mottle: 0.6, rough: 1.2, step: 14, fade: [Math.PI / 2, 0.4], charge: [{ color: '#b98a5c', n: 2, size: 26, a: 0.6 }] })
    for (let i = 0; i < 5; i++) {
      const x = -h * 0.7 + i * h * 0.35
      box.pencil(g, r, [[x, -48 + Math.abs(x) * 0.05], [x + 16, -40 + Math.abs(x) * 0.03]], { a: 0.3, passes: 1 })
    }
  })
  const front = makeSprite(W, H, 0.5, 0.86, S, (g: G) => {
    const r = rng(seed + 1)
    box.under(g, wall)
    box.pencil(g, r, wall, { closed: true, a: 0.6, jit: 1.2 })
    if (birchBark) {
      // Birch bark: paper white, a grey shadow underneath, dark dashes.
      box.wash(g, r, wall, { color: '#e9e2d6', a: 0.9, pool: 0.8, mottle: 0.5, rough: 1.2, step: 14, charge: [{ color: '#c9bcc4', n: 3, size: 30, a: 0.7 }] })
      box.wash(g, r, [[-h * 0.86, -18], [-h * 0.5, -12], [0, -9], [h * 0.5, -13], [h * 0.9, -22], [h * 0.55, -5], [0, 0], [-h * 0.55, -4]], { color: '#a9a2b8', a: 0.6, pool: 0.3, mottle: 0.5, rough: 1.5, lost: 1 })
      for (let i = 0; i < 12; i++) {
        const x = -h * 0.82 + r() * h * 1.64
        const y = -30 + r() * 20 - Math.abs(x) * 0.04
        const len = 6 + r() * 14
        box.pencil(g, r, [[x, y], [x + len, y + (r() - 0.5) * 2]], { a: 0.85, w: 2.2, passes: 1, jit: 0.3 })
      }
      box.wash(g, r, oval(h * 0.3, -20, 12, 5, 7), { color: '#c98f6a', a: 0.6, pool: 0.4, rough: 1, lost: 1 })
    } else {
      box.wash(g, r, wall, {
        color: '#a8744a',
        a: 1,
        pool: 0.8,
        mottle: 0.7,
        grain: 0.7,
        rough: 1.4,
        step: 14,
        fade: [-Math.PI / 2, 0.3],
        charge: [
          { color: '#6f4a34', n: 4, size: 30, a: 0.8 },
          { color: '#c99862', n: 2, size: 26, a: 0.7 },
        ],
      })
      // The furrows of the bark: dragged strokes along its length.
      for (let i = 0; i < 9; i++) {
        const y = -30 + i * 3.4
        const x0 = -h * (0.84 - i * 0.03) + r() * 20
        const len = 30 + r() * 70
        box.dry(g, r, [[x0, y - Math.abs(x0) * 0.06], [x0 + len * 0.5, y + 2 - Math.abs(x0 + len * 0.5) * 0.05], [x0 + len, y + 1 - Math.abs(x0 + len) * 0.06]], 2 + r() * 2, '#6f4a34', 0.6)
      }
      box.wash(g, r, oval(-h * 0.36, -24, 13, 6, 7), { color: '#a3c160', a: 0.8, pool: 0.5, rough: 1, lost: 1 })
    }
    // The cut edge of the bark along the top of the wall.
    box.pencil(g, r, [[rimL + 4, -39], [-h * 0.6, -33.5], [0, -30.5], [h * 0.6, -34.5], [h - 4, -41]], { a: 0.5, passes: 1, jit: 0.6 })
  })
  return { back, front }
}

function walnutHull(box: Box, S: number, seed: number): { back: Sprite; front: Sprite } {
  const W = 142
  const H = 88
  const inside = oval(0, -45, 56, 13, 14)
  const wall: Pt[] = oval(0, -45, 56, 13, 8, 0, Math.PI, 0).concat([
    [58, -42],
    [54, -26],
    [40, -10],
    [20, -1],
    [0, 1],
    [-20, -1],
    [-40, -10],
    [-54, -26],
    [-58, -42],
  ])
  const back = makeSprite(W, H, 0.5, 0.9, S, (g: G) => {
    const r = rng(seed)
    box.under(g, inside)
    box.pencil(g, r, inside, { closed: true, a: 0.5, jit: 0.8 })
    box.wash(g, r, inside, { color: '#d9b987', a: 0.95, pool: 0.8, mottle: 0.6, rough: 1, step: 10, charge: [{ color: '#a97c52', n: 2, size: 20, a: 0.7 }] })
    box.pencil(g, r, [[-2, -57], [0, -45], [-1, -34]], { a: 0.5, passes: 1, jit: 0.5 })
  })
  const front = makeSprite(W, H, 0.5, 0.9, S, (g: G) => {
    const r = rng(seed + 1)
    box.under(g, wall)
    box.pencil(g, r, wall, { closed: true, a: 0.6, jit: 1 })
    box.wash(g, r, wall, {
      color: '#cfa066',
      a: 1,
      pool: 0.85,
      mottle: 0.7,
      grain: 0.6,
      rough: 1.2,
      step: 12,
      fade: [-2.2, 0.35],
      charge: [
        { color: '#9c6c40', n: 3, size: 22, a: 0.8 },
        { color: '#e6c58c', n: 2, size: 20, a: 0.7 },
      ],
    })
    // The wrinkles of the shell.
    for (let i = 0; i < 9; i++) {
      const x = -44 + i * 11 + (r() - 0.5) * 5
      const top = -32 + Math.abs(x) * 0.12
      const wr: Pt[] = [
        [x, top],
        [x + (r() - 0.5) * 7, top + 9],
        [x * 0.8 + (r() - 0.5) * 6, top + 18],
        [x * 0.62, Math.min(-2, top + 27)],
      ]
      box.pencil(g, r, wr, { a: 0.5, passes: 1, jit: 1.2, step: 8 })
      if (i % 2 === 0) box.dry(g, r, wr, 2.4, '#9c6c40', 0.5)
    }
    box.pencil(g, r, oval(0, -45, 56, 13, 8, 0, Math.PI, 0), { a: 0.5, passes: 1, jit: 0.6 })
  })
  return { back, front }
}

// ---------------------------------------------------------------- masts

export interface MastDef {
  key: string
  sprite: Sprite
  len: number
}

function twig(box: Box, S: number, seed: number, len: number, kind: 'plain' | 'fork' | 'leafy'): Sprite {
  return makeSprite(70, len + 26, 0.5, (len + 16) / (len + 26), S, (g: G) => {
    const r = rng(seed)
    const bend = (r() - 0.5) * 9
    const at = (t: number): Pt => [Math.sin(t * Math.PI) * bend + Math.sin(t * 7 + seed) * 1.4, -len * t]
    const wide = (t: number) => 4.4 - 2.2 * t
    const l: Pt[] = []
    const rr: Pt[] = []
    const N = 9
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const [x, y] = at(t)
      l.push([x - wide(t), y])
      rr.unshift([x + wide(t), y])
    }
    const body = l.concat(rr)
    const limb = (from: number, dx: number, dy: number, w: number) => {
      const [x, y] = at(from)
      const pts: Pt[] = [
        [x - w * 0.5, y],
        [x + dx * 0.5 - w * 0.5, y + dy * 0.5],
        [x + dx, y + dy],
        [x + dx * 0.5 + w * 0.5, y + dy * 0.5 + 1],
        [x + w * 0.5, y + 2],
      ]
      box.under(g, pts)
      box.wash(g, r, pts, { color: '#9a7350', a: 1, pool: 0.7, mottle: 0.5, rough: 0.6, step: 8 })
      box.pencil(g, r, [[x, y], [x + dx * 0.5, y + dy * 0.5], [x + dx, y + dy]], { a: 0.5, passes: 1, jit: 0.4 })
      return [x + dx, y + dy] as Pt
    }
    if (kind === 'fork') {
      limb(0.8, -17, -34, 5)
      limb(0.82, 14, -26, 5)
    }
    if (kind === 'leafy') {
      const tip = limb(0.62, 20, -16, 4)
      const leaf = place([[0, 0], [8, -7], [19, -6], [24, 0], [17, 6], [7, 6]], tip[0], tip[1], -0.5)
      box.under(g, leaf)
      box.wash(g, r, leaf, { color: '#93c25c', a: 1, pool: 0.8, mottle: 0.3, rough: 0.6, step: 6 })
      box.pencil(g, r, leaf, { closed: true, a: 0.45, passes: 1, jit: 0.5 })
    }
    box.under(g, body)
    box.pencil(g, r, l, { a: 0.55, jit: 0.6 })
    box.pencil(g, r, rr, { a: 0.5, jit: 0.6 })
    box.wash(g, r, body, { color: '#a47a54', a: 1, pool: 0.8, mottle: 0.6, grain: 0.6, rough: 0.7, step: 12, charge: [{ color: '#6f4d36', n: 3, size: 14, a: 0.8 }] })
    for (let i = 0; i < 5; i++) {
      const [x, y] = at(0.12 + r() * 0.76)
      box.pencil(g, r, [[x - 3, y], [x + 3, y + (r() - 0.5) * 2]], { a: 0.55, passes: 1, jit: 0.3 })
    }
    // The pale wood where it was snapped off.
    const [bx, by] = at(0)
    box.wash(g, r, oval(bx, by + 1, 4, 2.4, 6), { color: '#e6cfa2', a: 0.9, pool: 0.5, rough: 0.4, step: 4, mottle: 0 })
  })
}

// ---------------------------------------------------------------- sails

export interface SailDef {
  key: string
  sprite: Sprite
  // How much wind it catches, 0..1, its height, and whether it flutters.
  area: number
  h: number
  w: number
  flutter: number
}

interface LeafPaint {
  half: Pt[]
  color: string
  charge: { color: string; n: number; size: number; a?: number }[]
  veins: number
  stem: number
  serrate?: boolean
}

function leaf(box: Box, S: number, seed: number, w: number, h: number, p: LeafPaint): Sprite {
  return makeSprite(w + 26, h + 40, 0.5, 0.5, S, (g: G) => {
    const r = rng(seed)
    const pts = mirror(p.half)
    let top = 0
    let bot = 0
    for (const q of pts) {
      if (q[1] < top) top = q[1]
      if (q[1] > bot) bot = q[1]
    }
    box.under(g, pts)
    box.pencil(g, r, pts, { closed: true, a: 0.5, jit: 1.1, step: 14 })
    box.wash(g, r, pts, { color: p.color, a: 1, pool: 0.85, mottle: 0.65, grain: 0.5, rough: p.serrate ? 1.8 : 1, step: p.serrate ? 6 : 12, fade: [-2.2, 0.28], charge: p.charge })
    // Midrib and veins, in pencil over the dry wash.
    box.pencil(g, r, [[0, top + 6], [1, (top + bot) / 2], [0, bot + p.stem]], { a: 0.6, jit: 0.6 })
    for (let i = 0; i < p.veins; i++) {
      const y = top + (bot - top) * (0.22 + (0.62 * i) / Math.max(1, p.veins - 1))
      const reach = w * 0.34 * Math.sin(Math.PI * (0.2 + (0.7 * i) / Math.max(1, p.veins - 1)))
      box.pencil(g, r, [[0, y], [reach * 0.6, y - reach * 0.42], [reach, y - reach * 0.62]], { a: 0.38, passes: 1, jit: 0.5 })
      box.pencil(g, r, [[0, y], [-reach * 0.6, y - reach * 0.42], [-reach, y - reach * 0.62]], { a: 0.38, passes: 1, jit: 0.5 })
    }
    box.dry(g, r, [[0, bot - 2], [0.5, bot + p.stem * 0.5], [1.5, bot + p.stem]], 2.6, '#8a6a44', 0.9)
  })
}

function feather(box: Box, S: number, seed: number): Sprite {
  return makeSprite(70, 186, 0.5, 0.5, S, (g: G) => {
    const r = rng(seed)
    const vane: Pt[] = [
      [0, -78],
      [0, -78],
      [11, -58],
      [17, -30],
      [19, 0],
      [15, 26],
      [7, 46],
      [0, 52],
      [-6, 44],
      [-13, 24],
      [-15, -2],
      [-13, -32],
      [-8, -58],
    ]
    box.under(g, vane)
    box.pencil(g, r, vane, { closed: true, a: 0.55, jit: 0.9, step: 12 })
    box.wash(g, r, vane, {
      color: '#dfe3ee',
      a: 0.95,
      pool: 0.8,
      mottle: 0.5,
      rough: 0.8,
      step: 10,
      charge: [
        { color: '#7fa9dc', n: 2, size: 16, a: 0.9 },
        { color: '#a9a6c4', n: 2, size: 14, a: 0.7 },
      ],
    })
    // The blue-barred edge of a jay's feather.
    for (let i = 0; i < 7; i++) {
      const y = -52 + i * 13
      box.wash(g, r, [[8, y], [17 - Math.abs(i - 3) * 0.6, y + 1], [17 - Math.abs(i - 3) * 0.6, y + 6], [8, y + 5]], { color: i % 2 === 0 ? '#5f93d6' : '#3f4a6a', a: 0.85, pool: 0.4, mottle: 0, grain: 0.2, rough: 0.5, step: 6 })
    }
    for (let i = 0; i < 15; i++) {
      const y = -66 + i * 7.6
      box.pencil(g, r, [[0, y], [10 + Math.sin(i * 0.4) * 4, y - 7]], { a: 0.34, passes: 1, jit: 0.4 })
      box.pencil(g, r, [[0, y], [-9 - Math.sin(i * 0.4) * 3, y - 6]], { a: 0.34, passes: 1, jit: 0.4 })
    }
    box.pencil(g, r, [[0, -76], [0.6, 0], [0, 80]], { a: 0.7, jit: 0.5 })
    box.dry(g, r, [[0, 50], [0.2, 66], [0, 80]], 2.4, '#cfc8b8', 0.9)
  })
}

// ---------------------------------------------------------------- cargo

export interface CargoDef {
  key: string
  sprite: Sprite
  r: number
}

function acornCap(box: Box, S: number, seed: number): Sprite {
  return makeSprite(52, 44, 0.5, 0.86, S, (g: G) => {
    const r = rng(seed)
    const cup: Pt[] = [
      [-17, -19],
      [-17, -19],
      [-15, -8],
      [-8, -1],
      [0, 1],
      [8, -1],
      [15, -8],
      [17, -19],
      [17, -19],
      [8, -15],
      [0, -14],
      [-8, -15],
    ]
    const mouth = oval(0, -19, 17, 5.2, 10)
    box.under(g, mouth)
    box.wash(g, r, mouth, { color: '#8a6444', a: 1, pool: 0.7, mottle: 0.4, rough: 0.6, step: 6, charge: [{ color: '#5a3f2c', n: 1, size: 9, a: 0.9 }] })
    box.pencil(g, r, mouth, { closed: true, a: 0.55, jit: 0.5 })
    box.under(g, cup)
    box.pencil(g, r, cup, { closed: true, a: 0.55, jit: 0.6 })
    box.wash(g, r, cup, { color: '#b58a5a', a: 1, pool: 0.85, mottle: 0.5, grain: 0.6, rough: 0.7, step: 8, fade: [-2.3, 0.3], charge: [{ color: '#7d5a3c', n: 2, size: 10, a: 0.8 }] })
    // Scales: a quick cross-hatch.
    for (let i = 0; i < 5; i++) {
      box.pencil(g, r, [[-13 + i * 6, -13], [-9 + i * 5, -3]], { a: 0.4, passes: 1, jit: 0.4 })
      box.pencil(g, r, [[-10 + i * 6, -13], [-14 + i * 6, -5]], { a: 0.3, passes: 1, jit: 0.4 })
    }
    box.dry(g, r, [[0, 0], [1, 4]], 2.4, '#7d5a3c', 0.9)
  })
}

function berries(box: Box, S: number, seed: number): Sprite {
  return makeSprite(56, 50, 0.5, 0.88, S, (g: G) => {
    const r = rng(seed)
    box.pencil(g, r, [[-2, -30], [0, -18], [6, -10]], { a: 0.6, jit: 0.5 })
    box.pencil(g, r, [[0, -20], [-9, -11]], { a: 0.55, passes: 1 })
    const one = (x: number, y: number, rad: number) => {
      const b = oval(x, y, rad, rad * 0.95, 9)
      box.under(g, b)
      box.pencil(g, r, b, { closed: true, a: 0.45, jit: 0.6, passes: 1 })
      box.wash(g, r, b, { color: '#d6402f', a: 1, pool: 0.85, mottle: 0.4, grain: 0.3, rough: 0.5, step: 6, fade: [-2.3, 0.4], charge: [{ color: '#9c2430', n: 1, size: rad * 0.7, a: 0.8 }] })
      box.lift(g, r, oval(x - rad * 0.36, y - rad * 0.4, rad * 0.22, rad * 0.16, 5), 0.85)
      box.pencil(g, r, [[x + rad * 0.3, y + rad * 0.4], [x + rad * 0.5, y + rad * 0.44]], { a: 0.6, passes: 1, jit: 0.2 })
    }
    one(-11, -9, 8.6)
    one(9, -8, 9.4)
    one(-1, -13, 8)
  })
}

function daisy(box: Box, S: number, seed: number): Sprite {
  return makeSprite(56, 48, 0.5, 0.82, S, (g: G) => {
    const r = rng(seed)
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU + 0.2
      const petal = place([[0, 0], [8, -4.4], [19, -3.4], [22, 0], [19, 3.4], [8, 4.4]], Math.cos(a) * 3, -13 + Math.sin(a) * 2, a, 1, 0.62 + 0.38 * Math.abs(Math.cos(a)))
      const sq = petal.map(([x, y]) => [x, -13 + (y + 13) * 0.62] as Pt)
      box.under(g, sq)
      box.pencil(g, r, sq, { closed: true, a: 0.42, passes: 1, jit: 0.5 })
      box.wash(g, r, sq, { color: i % 3 === 0 ? '#e6dfe9' : '#f2eee6', a: 0.9, pool: 0.5, mottle: 0.2, grain: 0.2, rough: 0.4, step: 6 })
    }
    const eye = oval(0, -13, 8, 5.4, 9)
    box.under(g, eye)
    box.wash(g, r, eye, { color: '#eeb832', a: 1, pool: 0.8, mottle: 0.4, rough: 0.5, step: 5, charge: [{ color: '#d68a2a', n: 1, size: 5, a: 0.9 }] })
    box.pencil(g, r, eye, { closed: true, a: 0.45, passes: 1, jit: 0.4 })
  })
}

// ---------------------------------------------------------------- folk

function gnome(box: Box, S: number, seed: number, standing: boolean): Sprite {
  const up = standing ? 13 : 0
  return makeSprite(60, 104, 0.5, 0.86, S, (g: G) => {
    const r = rng(seed)
    g.translate(0, -up)
    if (standing) {
      for (const sx of [-6, 7]) {
        const boot: Pt[] = [
          [sx - 4, 2],
          [sx - 4, 9],
          [sx - 5, 13],
          [sx + 7, 13],
          [sx + 6, 9],
          [sx + 3, 7],
          [sx + 3, 2],
        ]
        box.under(g, boot)
        box.wash(g, r, boot, { color: '#7a583e', a: 1, pool: 0.8, mottle: 0.4, rough: 0.5, step: 6 })
        box.pencil(g, r, boot, { closed: true, a: 0.5, passes: 1, jit: 0.4 })
      }
    }
    const tunic: Pt[] = [
      [-9, -25],
      [-13, -12],
      [-15, 3],
      [0, 5],
      [15, 3],
      [13, -12],
      [9, -25],
    ]
    box.under(g, tunic)
    box.pencil(g, r, tunic, { closed: true, a: 0.55, jit: 0.8 })
    box.wash(g, r, tunic, { color: '#6c8fc0', a: 1, pool: 0.85, mottle: 0.6, grain: 0.5, rough: 0.9, step: 9, fade: [-2.2, 0.25], charge: [{ color: '#48659c', n: 2, size: 9, a: 0.8 }] })
    // A belt and an arm resting forward.
    box.dry(g, r, [[-13, -8], [0, -6], [13, -8]], 2.6, '#7a583e', 0.9)
    const arm = oval(8, -15, 4.6, 8.4, 8, 0.7)
    box.under(g, arm)
    box.wash(g, r, arm, { color: '#5d7fb2', a: 1, pool: 0.8, mottle: 0.4, rough: 0.5, step: 6 })
    box.pencil(g, r, arm, { closed: true, a: 0.5, passes: 1, jit: 0.4 })
    const hand = oval(13.4, -9.6, 3.2, 3, 6)
    box.under(g, hand)
    box.wash(g, r, hand, { color: '#f0c49c', a: 1, pool: 0.6, mottle: 0, grain: 0.1, rough: 0.3, step: 4 })
    // Head.
    const head = oval(1.5, -34, 11, 10.4, 11)
    box.under(g, head)
    box.pencil(g, r, head, { closed: true, a: 0.5, jit: 0.7 })
    box.wash(g, r, head, { color: '#f3caa2', a: 1, pool: 0.6, mottle: 0.3, grain: 0.3, rough: 0.6, step: 7, charge: [{ color: '#eda08a', n: 1, size: 5, a: 0.7 }] })
    box.wash(g, r, oval(8, -31, 3.6, 2.6, 6), { color: '#ea9486', a: 0.7, soft: 1.5, pool: 0, mottle: 0, grain: 0, rough: 0.3 })
    // Beard: paper kept white, a few pencil wisps.
    const beard: Pt[] = [
      [-7, -30],
      [-2, -27],
      [6, -27],
      [12, -30],
      [10, -19],
      [4, -11],
      [-2, -14],
      [-6, -21],
    ]
    box.under(g, beard)
    box.wash(g, r, beard, { color: '#e3e0ea', a: 0.8, pool: 0.6, mottle: 0.3, grain: 0.2, rough: 0.7, step: 6 })
    box.pencil(g, r, beard, { closed: true, a: 0.5, jit: 0.8 })
    for (let i = 0; i < 4; i++) box.pencil(g, r, [[-3 + i * 3.4, -26], [-1 + i * 2.6, -15 - Math.abs(i - 1.5)]], { a: 0.4, passes: 1, jit: 0.5 })
    // Two eyes and a nose. No mouth: the beard keeps his counsel.
    g.fillStyle = '#3c3640'
    g.beginPath()
    g.ellipse(4.6, -36.5, 1.25, 1.6, 0, 0, TAU)
    g.ellipse(10, -36.3, 1.2, 1.55, 0, 0, TAU)
    g.fill()
    box.wash(g, r, oval(8.6, -32.4, 2.4, 2, 6), { color: '#ee9c84', a: 0.9, pool: 0.5, mottle: 0, grain: 0, rough: 0.2, step: 4 })
    // The cap: tall, soft, tipping back.
    const cap: Pt[] = [
      [-10.5, -38],
      [-10.5, -38],
      [1, -41],
      [13.5, -39.5],
      [13.5, -39.5],
      [9, -54],
      [1, -66],
      [-9, -74],
      [-15, -75],
      [-15, -75],
      [-12, -64],
      [-13, -50],
    ]
    box.under(g, cap)
    box.pencil(g, r, cap, { closed: true, a: 0.55, jit: 0.9 })
    box.wash(g, r, cap, { color: '#d44a3c', a: 1, pool: 0.85, mottle: 0.6, grain: 0.5, rough: 0.9, step: 9, fade: [-2, 0.3], charge: [{ color: '#a82e36', n: 2, size: 10, a: 0.85 }] })
    box.pencil(g, r, [[-4, -47], [2, -58], [-4, -66]], { a: 0.3, passes: 1, jit: 0.6 })
  })
}

function frog(box: Box, S: number, seed: number): Sprite {
  return makeSprite(84, 62, 0.5, 0.9, S, (g: G) => {
    const r = rng(seed)
    const body: Pt[] = [
      [-30, -4],
      [-28, -18],
      [-14, -30],
      [6, -34],
      [20, -40],
      [30, -36],
      [34, -24],
      [30, -10],
      [16, -2],
      [-10, 0],
    ]
    const haunch: Pt[] = [
      [-32, -2],
      [-30, -18],
      [-16, -24],
      [-4, -14],
      [-4, -2],
      [-18, 2],
    ]
    box.under(g, body)
    box.pencil(g, r, body, { closed: true, a: 0.55, jit: 0.9 })
    box.wash(g, r, body, { color: '#8fbf52', a: 1, pool: 0.85, mottle: 0.6, grain: 0.4, rough: 1, step: 10, fade: [-2, 0.2], charge: [{ color: '#5f9344', n: 3, size: 12, a: 0.85 }, { color: '#d6dc76', n: 1, size: 12, a: 0.8 }] })
    // Pale throat.
    box.lift(g, r, [[14, -12], [30, -22], [31, -11], [18, -3]], 0.7, 1.5, '#f3ecc0')
    box.under(g, haunch)
    box.wash(g, r, haunch, { color: '#7fb14c', a: 1, pool: 0.85, mottle: 0.5, rough: 0.9, step: 8, charge: [{ color: '#55883e', n: 2, size: 9, a: 0.85 }] })
    box.pencil(g, r, haunch, { closed: true, a: 0.5, jit: 0.8 })
    // Feet.
    box.dry(g, r, [[-20, 1], [-8, 3], [2, 2]], 3, '#6c9c46', 0.95)
    box.dry(g, r, [[14, -6], [18, 1], [28, 3]], 3, '#6c9c46', 0.95)
    box.pencil(g, r, [[14, -6], [18, 1], [28, 3]], { a: 0.45, passes: 1, jit: 0.4 })
    // The eye sits up on the head.
    const eye = oval(20, -40, 6.4, 6, 9)
    box.under(g, eye)
    box.wash(g, r, eye, { color: '#e9d27a', a: 1, pool: 0.7, mottle: 0, grain: 0.2, rough: 0.4, step: 5 })
    box.pencil(g, r, eye, { closed: true, a: 0.6, jit: 0.4 })
    g.fillStyle = '#3c3640'
    g.beginPath()
    g.ellipse(21.4, -40, 2.6, 3, 0, 0, TAU)
    g.fill()
    box.pencil(g, r, [[26, -27], [33, -27]], { a: 0.5, passes: 1, jit: 0.3 })
  })
}

function kingfisher(box: Box, S: number, seed: number, flying: boolean): Sprite {
  return makeSprite(96, 72, 0.5, flying ? 0.5 : 0.84, S, (g: G) => {
    const r = rng(seed)
    if (flying) g.translate(0, 14)
    const body: Pt[] = [
      [-16, -8],
      [-12, -22],
      [0, -30],
      [10, -28],
      [15, -20],
      [12, -8],
      [2, -1],
      [-8, -2],
    ]
    const tail: Pt[] = [
      [-14, -10],
      [-27, -3],
      [-25, 2],
      [-10, -3],
    ]
    box.under(g, tail)
    box.wash(g, r, tail, { color: '#2f7fb8', a: 1, pool: 0.8, mottle: 0.4, rough: 0.6, step: 7 })
    box.under(g, body)
    box.pencil(g, r, body, { closed: true, a: 0.5, jit: 0.8 })
    box.wash(g, r, body, { color: '#ee8a3c', a: 1, pool: 0.85, mottle: 0.5, rough: 0.8, step: 8, charge: [{ color: '#d2622c', n: 1, size: 8, a: 0.8 }] })
    // Blue head and back over the orange.
    const back: Pt[] = [
      [-16, -9],
      [-12, -22],
      [0, -31],
      [11, -29],
      [15, -21],
      [8, -22],
      [0, -18],
      [-6, -10],
    ]
    box.under(g, back)
    box.wash(g, r, back, { color: '#2f8fc4', a: 1, pool: 0.85, mottle: 0.6, rough: 0.8, step: 8, charge: [{ color: '#2a5fa8', n: 2, size: 8, a: 0.85 }, { color: '#58c4c8', n: 1, size: 8, a: 0.8 }] })
    box.lift(g, r, oval(8, -19, 3.4, 2.2, 6), 0.9)
    const bill: Pt[] = [
      [13, -25],
      [33, -22],
      [33, -22],
      [13, -19],
    ]
    box.under(g, bill)
    box.wash(g, r, bill, { color: '#4a4350', a: 1, pool: 0.6, mottle: 0.2, rough: 0.4, step: 8 })
    g.fillStyle = '#2c2832'
    g.beginPath()
    g.ellipse(8.4, -25, 1.5, 1.7, 0, 0, TAU)
    g.fill()
    if (flying) {
      for (const dir of [-1, 1]) {
        const wing: Pt[] = [
          [-8, -20],
          [-16, -20 + dir * 22],
          [-6, -20 + dir * 34],
          [-6, -20 + dir * 34],
          [8, -20 + dir * 20],
          [6, -20],
        ]
        box.under(g, wing)
        box.wash(g, r, wing, { color: dir < 0 ? '#3aa0cc' : '#2a78b4', a: 1, pool: 0.8, mottle: 0.5, rough: 0.9, step: 8, charge: [{ color: '#2a5fa8', n: 1, size: 9, a: 0.8 }] })
        box.pencil(g, r, wing, { closed: true, a: 0.45, jit: 0.8 })
      }
    } else {
      const wing: Pt[] = [
        [-12, -20],
        [-2, -22],
        [6, -14],
        [-4, -6],
        [-15, -8],
      ]
      box.wash(g, r, wing, { color: '#2a6fb0', a: 0.8, pool: 0.7, mottle: 0.4, rough: 0.7, step: 7 })
      box.pencil(g, r, wing, { closed: true, a: 0.45, passes: 1, jit: 0.6 })
      box.dry(g, r, [[0, -2], [1, 3]], 2, '#c8502c', 0.9)
      box.dry(g, r, [[-5, -2], [-5, 3]], 2, '#c8502c', 0.9)
    }
  })
}

// The water sprite: more water than person. Pale, soft-edged, two eyes.
function waterSprite(box: Box, S: number, seed: number): Sprite {
  return makeSprite(170, 170, 0.5, 0.94, S, (g: G) => {
    const r = rng(seed)
    const shape: Pt[] = [
      [-46, 0],
      [-40, -30],
      [-30, -52],
      [-24, -86],
      [-18, -112],
      [-4, -128],
      [12, -126],
      [24, -110],
      [26, -88],
      [30, -62],
      [46, -52],
      [66, -56],
      [72, -48],
      [56, -36],
      [38, -32],
      [44, 0],
    ]
    box.under(g, shape, 0.62)
    box.wash(g, r, shape, {
      color: '#8fd0dc',
      a: 0.9,
      pool: 0.55,
      mottle: 0.7,
      grain: 0.3,
      rough: 2.4,
      step: 14,
      lost: 1,
      fade: [Math.PI / 2, 0.55],
      charge: [
        { color: '#5fa8d2', n: 3, size: 26, a: 0.7 },
        { color: '#bfe6d8', n: 2, size: 24, a: 0.8 },
      ],
    })
    // Hair like weed in a current.
    for (let i = 0; i < 8; i++) {
      const x0 = -18 + i * 5
      const st: Pt[] = [
        [x0, -118 + Math.abs(i - 3.5) * 3],
        [x0 - 16 - i * 2, -92 + i * 3],
        [x0 - 30 - i * 2, -56 + i * 5],
        [x0 - 34 - i, -24 + i * 3],
      ]
      box.dry(g, r, st, 3.4, i % 2 === 0 ? '#5fa8d2' : '#7cc4b4', 0.6)
      if (i % 3 === 0) box.pencil(g, r, st, { a: 0.3, passes: 1 })
    }
    const face = oval(8, -106, 15, 16, 10)
    box.under(g, face, 0.7)
    box.wash(g, r, face, { color: '#d4efe6', a: 0.9, pool: 0.5, mottle: 0.4, grain: 0.2, rough: 0.8, step: 8 })
    box.pencil(g, r, face, { closed: true, a: 0.32, jit: 0.9 })
    g.fillStyle = 'rgba(52,70,96,0.85)'
    g.beginPath()
    g.ellipse(6, -107, 1.6, 2.1, 0, 0, TAU)
    g.ellipse(16, -106.4, 1.5, 2, 0, 0, TAU)
    g.fill()
    box.pencil(g, r, [[26, -86], [44, -52], [66, -54]], { a: 0.3, passes: 1 })
  }, 0.5)
}

// ---------------------------------------------------------------- the brook's own things

function brookStone(box: Box, S: number, seed: number, w: number, h: number): Sprite {
  return makeSprite(w + 30, h + 34, 0.5, (h + 16) / (h + 34), S, (g: G) => {
    const r = rng(seed)
    const pts: Pt[] = []
    const n = 8
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (Math.PI * i) / (n - 1)
      const k = 0.86 + r() * 0.28
      pts.push([Math.cos(a) * (w / 2) * k, Math.sin(a) * h * k * (0.7 + 0.3 * Math.abs(Math.sin(a)))])
    }
    pts.push([w * 0.4, 6], [0, 9], [-w * 0.4, 7])
    box.under(g, pts)
    box.pencil(g, r, pts, { closed: true, a: 0.55, jit: 1.3 })
    box.wash(g, r, pts, { color: seed % 2 === 0 ? '#c2b7b6' : '#b6b0cc', a: 1, pool: 0.75, mottle: 0.8, grain: 0.9, rough: 1.6, step: 14, fade: [-2.2, 0.5], charge: [{ color: '#d8c092', n: 2, size: w * 0.16, a: 0.7 }] })
    box.wash(g, r, [[w * 0.04, -h * 0.82], [w * 0.36, -h * 0.5], [w * 0.46, 0], [w * 0.3, 7], [0, 8], [w * 0.1, -h * 0.3]], { color: '#8e88b2', a: 0.75, pool: 0.6, mottle: 0.7, grain: 0.6, rough: 2, step: 12, lost: 1 })
    // The wet line where the water touches.
    box.wash(g, r, [[-w * 0.46, 0], [0, 3], [w * 0.46, 0], [w * 0.4, 7], [0, 10], [-w * 0.4, 8]], { color: '#6f7fa0', a: 0.7, pool: 0.3, mottle: 0.4, rough: 1.2, step: 12 })
    box.wash(g, r, oval(-w * 0.12, -h * 0.84, w * 0.2, h * 0.14, 7), { color: '#a3c160', a: 0.9, pool: 0.5, rough: 1.4, lost: 1 })
    box.pencil(g, r, [[-w * 0.24, -h * 0.5], [-w * 0.1, -h * 0.36], [-w * 0.08, -h * 0.1]], { a: 0.4, passes: 1, jit: 1 })
  })
}

function reedClump(box: Box, S: number, seed: number): Sprite {
  return makeSprite(190, 250, 0.5, 0.95, S, (g: G) => {
    const r = rng(seed)
    for (let i = 0; i < 9; i++) {
      // Long blade leaves, bending over.
      const bx = (r() - 0.5) * 80
      const h = 110 + r() * 90
      const lean = (r() - 0.5) * 110
      const blade: Pt[] = [
        [bx - 3.4, 0],
        [bx + lean * 0.25 - 3, -h * 0.5],
        [bx + lean * 0.8, -h * 0.95],
        [bx + lean, -h * 0.9],
        [bx + lean * 0.4 + 3, -h * 0.5],
        [bx + 3.4, 0],
      ]
      box.under(g, blade)
      box.wash(g, r, blade, { color: i % 3 === 0 ? '#a9c466' : '#86b060', a: 1, pool: 0.8, mottle: 0.5, rough: 0.8, step: 22, fade: [-Math.PI / 2, 0.3] })
      if (i % 2 === 0) box.pencil(g, r, [[bx, 0], [bx + lean * 0.3, -h * 0.5], [bx + lean * 0.9, -h * 0.93]], { a: 0.42, passes: 1, jit: 0.8 })
    }
    for (let i = 0; i < 6; i++) {
      const bx = (r() - 0.5) * 70
      const h = 160 + r() * 66
      const lean = (r() - 0.5) * 36
      const stalk: Pt[] = [
        [bx, 0],
        [bx + lean * 0.4, -h * 0.5],
        [bx + lean, -h],
      ]
      box.dry(g, r, stalk, 3, '#7f9d55', 0.95)
      box.pencil(g, r, stalk, { a: 0.42, passes: 1, jit: 0.6 })
      const head = oval(bx + lean * 0.86, -h * 0.9, 5.4, 19, 9, lean * 0.006)
      box.under(g, head)
      box.wash(g, r, head, { color: '#8f6242', a: 1, pool: 0.8, mottle: 0.5, grain: 0.6, rough: 0.6, step: 8, charge: [{ color: '#5f3f2c', n: 1, size: 7, a: 0.85 }] })
      box.pencil(g, r, head, { closed: true, a: 0.45, passes: 1, jit: 0.5 })
    }
  })
}

function lilyPad(box: Box, S: number, seed: number, flower: boolean): Sprite {
  return makeSprite(124, 74, 0.5, 0.62, S, (g: G) => {
    const r = rng(seed)
    // A round leaf with a notch, seen at a slant.
    const pad: Pt[] = oval(0, 0, 52, 17, 14, 0, 0.5, TAU - 0.05).concat([[10, 2]])
    box.wash(g, r, oval(4, 5, 52, 15, 10), { color: '#4f7f9c', a: 0.4, soft: 3, pool: 0, mottle: 0.2, grain: 0, rough: 1 })
    box.under(g, pad)
    box.pencil(g, r, pad, { closed: true, a: 0.5, jit: 0.9 })
    box.wash(g, r, pad, { color: '#84b862', a: 1, pool: 0.85, mottle: 0.6, grain: 0.4, rough: 1, step: 12, fade: [-2.3, 0.25], charge: [{ color: '#5c9a58', n: 2, size: 18, a: 0.8 }, { color: '#c6d874', n: 1, size: 16, a: 0.8 }] })
    for (let i = 0; i < 7; i++) {
      const a = 0.9 + i * 0.75
      box.pencil(g, r, [[10, 2], [Math.cos(a) * 44, Math.sin(a) * 14]], { a: 0.3, passes: 1, jit: 0.5 })
    }
    if (flower) {
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.36
        const petal = place([[0, 0], [9, -5], [22, -3], [27, 0], [22, 3.4], [9, 5]], -14, -3, a)
        box.under(g, petal)
        box.wash(g, r, petal, { color: i % 2 === 0 ? '#f3d6e2' : '#f6e6ea', a: 1, pool: 0.75, mottle: 0.2, grain: 0.2, rough: 0.5, step: 7, charge: [{ color: '#e69ab8', n: 1, size: 6, a: 0.7 }] })
        box.pencil(g, r, petal, { closed: true, a: 0.42, passes: 1, jit: 0.5 })
      }
      box.wash(g, r, oval(-14, -7, 4.4, 3.4, 6), { color: '#eeb832', a: 1, pool: 0.6, mottle: 0, grain: 0.2, rough: 0.4, step: 4 })
    }
  })
}

function sun(box: Box, S: number, seed: number, color: string, edge: string): Sprite {
  return makeSprite(220, 220, 0.5, 0.5, S, (g: G) => {
    const r = rng(seed)
    // Paper lifted round it: its light. Then a few loose strokes of ray.
    box.lift(g, r, oval(0, 0, 76, 76, 12), 0.5, 16, '#fff6d6')
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + (r() - 0.5) * 0.14
      const d0 = 60 + r() * 6
      const d1 = d0 + 13 + r() * 13
      box.dry(g, r, [[Math.cos(a) * d0, Math.sin(a) * d0], [Math.cos(a) * d1, Math.sin(a) * d1]], 4.4, color, 0.7)
    }
    const disc = oval(0, 0, 46, 46, 14)
    box.under(g, disc)
    box.pencil(g, r, oval(2, -1, 47, 46, 12), { closed: true, a: 0.3, jit: 1.6 })
    box.wash(g, r, disc, { color, a: 1, pool: 0.8, mottle: 0.6, grain: 0.4, rough: 1.4, step: 14, charge: [{ color: edge, n: 3, size: 22, a: 0.8 }, { color: '#fff0a8', n: 2, size: 20, a: 0.9 }] })
  }, 0)
}

function butterfly(box: Box, S: number, seed: number, color: string): Sprite {
  return makeSprite(34, 30, 0.5, 0.5, S, (g: G) => {
    const r = rng(seed)
    const wing: Pt[] = [
      [0, 0],
      [3, -9],
      [11, -11],
      [13, -3],
      [8, 1],
      [11, 7],
      [5, 10],
      [0, 3],
    ]
    box.under(g, wing)
    box.wash(g, r, wing, { color, a: 1, pool: 0.8, mottle: 0.3, grain: 0.2, rough: 0.5, step: 6 })
    box.pencil(g, r, wing, { closed: true, a: 0.5, passes: 1, jit: 0.4 })
    box.pencil(g, r, [[0, -5], [0, 6]], { a: 0.8, w: 1.6, passes: 1, jit: 0.2 })
  })
}

function dragonfly(box: Box, S: number, seed: number): Sprite {
  return makeSprite(56, 34, 0.5, 0.5, S, (g: G) => {
    const r = rng(seed)
    for (const [dx, rot] of [[-2, -0.5], [3, 0.35]] as const) {
      const wing = oval(dx, -8, 4, 13, 8, rot)
      box.under(g, wing, 0.5)
      box.wash(g, r, wing, { color: '#bfe0e6', a: 0.8, pool: 0.7, mottle: 0.2, grain: 0, rough: 0.4, step: 6 })
      box.pencil(g, r, wing, { closed: true, a: 0.4, passes: 1, jit: 0.3 })
    }
    box.dry(g, r, [[-22, 2], [0, 0], [10, -1]], 3, '#3f8fb8', 1)
    box.wash(g, r, oval(12, -1, 4, 3.4, 6), { color: '#2f6f9c', a: 1, pool: 0.6, mottle: 0, grain: 0, rough: 0.3, step: 4 })
  })
}

// A soft pool of shadow for things lying on the bank.
function shadow(box: Box, S: number): Sprite {
  return makeSprite(140, 50, 0.5, 0.5, S, (g: G) => {
    const r = rng(5)
    box.wash(g, r, oval(0, 0, 50, 11, 10), { color: '#5f7f6a', a: 0.55, soft: 6, pool: 0, mottle: 0.3, grain: 0.2, rough: 1 })
  }, 0)
}

// A small paper lantern, and a bare flame for an acorn-cap lamp.
function lantern(box: Box, S: number): Sprite {
  return makeSprite(30, 40, 0.5, 0.2, S, (g: G) => {
    const r = rng(8)
    box.pencil(g, r, [[0, -6], [0, 2]], { a: 0.7, passes: 1, jit: 0.2 })
    const body = oval(0, 13, 8.4, 10.6, 10)
    box.under(g, body)
    box.wash(g, r, body, { color: '#f6c84a', a: 1, pool: 0.8, mottle: 0.3, grain: 0.2, rough: 0.5, step: 6, charge: [{ color: '#fff3b8', n: 1, size: 6, a: 1 }, { color: '#ee9a3a', n: 1, size: 5, a: 0.7 }] })
    box.pencil(g, r, body, { closed: true, a: 0.55, jit: 0.5 })
    box.pencil(g, r, [[-6, 4], [6, 4]], { a: 0.5, passes: 1, jit: 0.3 })
    box.pencil(g, r, [[-6, 22], [6, 22]], { a: 0.5, passes: 1, jit: 0.3 })
  }, 0)
}

function flame(box: Box, S: number): Sprite {
  return makeSprite(22, 30, 0.5, 0.86, S, (g: G) => {
    const r = rng(9)
    const f: Pt[] = [
      [0, -19],
      [0, -19],
      [5, -9],
      [5.4, -3],
      [0, 1],
      [-5.4, -3],
      [-4, -10],
    ]
    box.under(g, f)
    box.wash(g, r, f, { color: '#f8c84a', a: 1, pool: 0.7, mottle: 0, grain: 0, rough: 0.4, step: 6, charge: [{ color: '#fff6c8', n: 1, size: 5, a: 1 }] })
  }, 0)
}

// Light, the one thing watercolour cannot paint over dark: a glow laid on.
function glow(size: number, inner: string, outer: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gr.addColorStop(0, inner)
  gr.addColorStop(0.35, outer)
  gr.addColorStop(1, 'rgba(255,220,140,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, size, size)
  return c
}

// ---------------------------------------------------------------- the set

export interface Pieces {
  hulls: Record<string, HullDef>
  masts: Record<string, MastDef>
  sails: Record<string, SailDef>
  cargo: Record<string, CargoDef>
  gnomeSit: Sprite
  gnomeStand: Sprite
  readonly frog: Sprite
  readonly kingfisher: Sprite
  readonly kingfisherFly: Sprite
  readonly waterSprite: Sprite
  readonly stones: Sprite[]
  readonly reeds: Sprite[]
  readonly lily: Sprite
  readonly lilyFlower: Sprite
  sun: Sprite
  readonly sunLow: Sprite
  butterflies: Sprite[]
  readonly dragonfly: Sprite
  shadow: Sprite
  readonly lantern: Sprite
  readonly flame: Sprite
  glow: HTMLCanvasElement
  spark: HTMLCanvasElement
  // Paint-on-first-use sprites, to be warmed in the background.
  warm: (() => unknown)[]
}

export function paintPieces(box: Box, S: number): Pieces {
  const barkA = barkHull(box, S, 11, 204, false)
  const barkB = barkHull(box, S, 21, 176, true)
  const nutA = walnutHull(box, S, 31)
  const nutB = walnutHull(box, S, 41)
  const hulls: Record<string, HullDef> = {
    barkA: { key: 'barkA', ...barkA, halfW: 102, deckY: -34, mastX: 8, seatX: -50, cargoFrom: 30, cargoTo: 80, holds: 4, draft: 9, bob: 2.6, roll: 0.03, spins: false, rimY: -41 },
    barkB: { key: 'barkB', ...barkB, halfW: 88, deckY: -34, mastX: 6, seatX: -44, cargoFrom: 26, cargoTo: 70, holds: 3, draft: 9, bob: 3, roll: 0.036, spins: false, rimY: -41 },
    nutA: { key: 'nutA', ...nutA, halfW: 58, deckY: -42, mastX: 8, seatX: -22, cargoFrom: 20, cargoTo: 40, holds: 2, draft: 12, bob: 5.2, roll: 0.085, spins: true, rimY: -45 },
    nutB: { key: 'nutB', ...nutB, halfW: 58, deckY: -42, mastX: 8, seatX: -22, cargoFrom: 20, cargoTo: 40, holds: 2, draft: 12, bob: 5.2, roll: 0.085, spins: true, rimY: -45 },
  }
  const masts: Record<string, MastDef> = {
    twigA: { key: 'twigA', sprite: twig(box, S, 51, 178, 'plain'), len: 178 },
    twigB: { key: 'twigB', sprite: twig(box, S, 52, 132, 'fork'), len: 132 },
    twigC: { key: 'twigC', sprite: twig(box, S, 53, 156, 'leafy'), len: 156 },
  }
  const lime = leaf(box, S, 61, 112, 124, {
    half: [[0, -62], [0, -62], [13, -49], [33, -30], [51, -3], [54, 21], [43, 43], [23, 56], [7, 57], [0, 50]],
    color: '#8cc254',
    charge: [{ color: '#d6dc6a', n: 2, size: 26, a: 0.85 }, { color: '#5c9a4c', n: 2, size: 24, a: 0.8 }],
    veins: 4,
    stem: 20,
  })
  const maple = leaf(box, S, 62, 134, 104, {
    half: [[0, -62], [0, -62], [8, -45], [16, -31], [34, -40], [61, -31], [61, -31], [46, -13], [31, -1], [48, 8], [52, 26], [52, 26], [31, 23], [11, 34], [0, 36]],
    color: '#e2683a',
    charge: [{ color: '#f2b23e', n: 3, size: 26, a: 0.9 }, { color: '#c23a30', n: 2, size: 24, a: 0.85 }],
    veins: 3,
    stem: 24,
  })
  const oak = leaf(box, S, 63, 70, 132, {
    half: [[0, -68], [13, -61], [21, -47], [11, -38], [27, -25], [29, -9], [13, -2], [27, 13], [23, 30], [9, 36], [11, 52], [0, 60]],
    color: '#cf9c44',
    charge: [{ color: '#a86c34', n: 3, size: 20, a: 0.85 }, { color: '#e6c860', n: 2, size: 18, a: 0.8 }],
    veins: 4,
    stem: 14,
  })
  const birchLeaf = leaf(box, S, 64, 70, 84, {
    half: [[0, -44], [0, -44], [12, -27], [26, -7], [34, 10], [28, 26], [12, 36], [0, 38]],
    color: '#efc840',
    charge: [{ color: '#c8cf58', n: 2, size: 16, a: 0.85 }, { color: '#e69a34', n: 1, size: 14, a: 0.8 }],
    veins: 3,
    stem: 16,
    serrate: true,
  })
  const sails: Record<string, SailDef> = {
    lime: { key: 'lime', sprite: lime, area: 1, h: 124, w: 112, flutter: 0.4 },
    maple: { key: 'maple', sprite: maple, area: 0.95, h: 104, w: 134, flutter: 0.5 },
    oak: { key: 'oak', sprite: oak, area: 0.62, h: 132, w: 70, flutter: 0.5 },
    birch: { key: 'birch', sprite: birchLeaf, area: 0.42, h: 84, w: 70, flutter: 0.8 },
    feather: { key: 'feather', sprite: feather(box, S, 65), area: 0.5, h: 132, w: 40, flutter: 1.6 },
  }
  const cargo: Record<string, CargoDef> = {
    acorn: { key: 'acorn', sprite: acornCap(box, S, 71), r: 17 },
    berries: { key: 'berries', sprite: berries(box, S, 72), r: 19 },
    daisy: { key: 'daisy', sprite: daisy(box, S, 73), r: 20 },
  }
  // What is only met downstream is painted when it is first wanted (the
  // game warms these one at a time while the child is still building).
  const later = <T>(fn: () => T): (() => T) => {
    let v: T | undefined
    return () => (v ??= fn())
  }
  const frogS = later(() => frog(box, S, 82))
  const kfS = later(() => kingfisher(box, S, 83, false))
  const kfFlyS = later(() => kingfisher(box, S, 83, true))
  const nixieS = later(() => waterSprite(box, S, 84))
  const stonesS = later(() => [brookStone(box, S, 90, 96, 34), brookStone(box, S, 91, 84, 30), brookStone(box, S, 92, 104, 36), brookStone(box, S, 93, 88, 32)])
  const reedsS = later(() => [reedClump(box, S, 95), reedClump(box, S, 96)])
  const lilyS = later(() => lilyPad(box, S, 97, false))
  const lilyFlowerS = later(() => lilyPad(box, S, 98, true))
  const sunLowS = later(() => sun(box, S, 101, '#f59a4a', '#e8603c'))
  const dragonS = later(() => dragonfly(box, S, 104))
  const lanternS = later(() => lantern(box, S))
  const flameS = later(() => flame(box, S))
  return {
    hulls,
    masts,
    sails,
    cargo,
    gnomeSit: gnome(box, S, 81, false),
    gnomeStand: gnome(box, S, 81, true),
    get frog() {
      return frogS()
    },
    get kingfisher() {
      return kfS()
    },
    get kingfisherFly() {
      return kfFlyS()
    },
    get waterSprite() {
      return nixieS()
    },
    get stones() {
      return stonesS()
    },
    get reeds() {
      return reedsS()
    },
    get lily() {
      return lilyS()
    },
    get lilyFlower() {
      return lilyFlowerS()
    },
    sun: sun(box, S, 101, '#f6cf52', '#f0a83c'),
    get sunLow() {
      return sunLowS()
    },
    butterflies: [butterfly(box, S, 102, '#f2e27a'), butterfly(box, S, 103, '#f3f0ea')],
    get dragonfly() {
      return dragonS()
    },
    shadow: shadow(box, S),
    get lantern() {
      return lanternS()
    },
    get flame() {
      return flameS()
    },
    glow: glow(160, 'rgba(255,238,170,0.85)', 'rgba(255,214,120,0.36)'),
    spark: glow(40, 'rgba(255,250,200,1)', 'rgba(250,230,130,0.5)'),
    warm: [frogS, stonesS, reedsS, dragonS, nixieS, kfS, kfFlyS, sunLowS, lilyS, lilyFlowerS, lanternS, flameS],
  }
}
