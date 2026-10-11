import { BACKDROP } from './config'
import { BOARD, CAT, GATE, LINE, PUDDLE, RAIL, RIDGES, SOAP, TUB } from './layout'
import { STAGE } from './stage'
import { beginSeeds, chain, knot, linenTile, oval, ring, running, satin, seeds, shade, soft, softPoints, stitch, wobbler, type Ctx, type Pt } from './stitch'

// The yard that stands still: one piece of linen with a garden stitched on it
// from edge to edge. It is painted once for each size of the surface and
// stamped as one picture every frame. Nothing here answers a touch.

export const THREAD = {
  linen: BACKDROP,
  sky: '#8fb0c9',
  cloud: '#f7f3e8',
  sun: '#edb53a',
  hill: '#b7c98a',
  lane: '#e9dcb6',
  hedge: '#557f45',
  hedgeLeaf: '#7fa85a',
  grass: '#86b05f',
  grassDark: '#6c9a4c',
  fence: '#f1e7cf',
  fenceLine: '#a58a62',
  bark: '#8a623f',
  leaf: '#6fa04c',
  leafLight: '#9bc267',
  leafDark: '#4f8141',
  apple: '#d4483b',
  roof: '#c8553f',
  wall: '#f3ead6',
  tub: '#c98f4a',
  tubInside: '#6f4a2a',
  hoop: '#6d7480',
  water: '#7fb6d8',
  wood: '#f2e5c3',
  woodDark: '#b98f55',
  mud: '#5c3b22',
  mudLight: '#8d5f37',
  suds: '#ffffff',
  border: '#b9463c',
  borderIn: '#55708f',
  gold: '#e8b33c',
} as const

/** How far the yard is painted past the stage on each side, in stage units, for a surface of another shape. */
export type Reach = { left: number; right: number; top: number; bottom: number }

/** Rows of short upright stitches, as grass or a clipped hedge is worked. */
function turf(g: Ctx, box: { x: number; y: number; w: number; h: number }, colour: string, seed: number, row = 15, gap = 3.6): void {
  const next = wobbler(seed)
  g.fillStyle = shade(colour, -0.2)
  g.fillRect(box.x, box.y, box.w, box.h)
  const tones = [colour, shade(colour, 0.13), shade(colour, -0.1)]
  const paths = tones.map(() => new Path2D())
  for (let y = box.y - row * 0.4; y < box.y + box.h; y += row) {
    for (let x = box.x; x < box.x + box.w; x += gap) {
      const top = y + (next() - 0.5) * row * 0.7, length = row * (0.95 + next() * 0.5)
      const path = paths[Math.floor(next() * 3)]
      path.moveTo(x, Math.max(box.y, top))
      path.lineTo(x + (next() - 0.5) * 1.6, Math.min(box.y + box.h, top + length))
    }
  }
  g.lineCap = 'butt'
  g.lineWidth = gap * 0.9
  tones.forEach((tone, i) => {
    g.strokeStyle = tone
    g.stroke(paths[i])
  })
  g.lineCap = 'round'
}

function cloud(g: Ctx, x: number, y: number, w: number, seed: number): void {
  const h = w * 0.36
  const puffs: Pt[] = [[x - w * 0.5, y + h * 0.5], [x - w * 0.42, y], [x - w * 0.2, y - h * 0.1], [x - w * 0.08, y - h * 0.5], [x + w * 0.18, y - h * 0.46], [x + w * 0.28, y - h * 0.08], [x + w * 0.46, y], [x + w * 0.5, y + h * 0.5]]
  satin(g, (c) => soft(c, puffs, 0.45), { x: x - w / 2, y: y - h / 2, w, h }, THREAD.cloud, 0, seed, 3.2)
  soft(g, puffs, 0.45)
  g.setLineDash([8, 6])
  g.lineWidth = 2.6
  g.strokeStyle = THREAD.sky
  g.stroke()
  g.setLineDash([])
}

function tree(g: Ctx, x: number, top: number, foot: number, seed: number): void {
  const next = wobbler(seed)
  satin(g, (c) => soft(c, [[x - 24, top + 40], [x + 22, top + 40], [x + 30, foot], [x - 34, foot]], 0.1), { x: x - 34, y: top, w: 64, h: foot - top }, THREAD.bark, Math.PI / 2 + 0.03, seed, 3.6)
  running(g, [[x - 8, top + 150], [x - 4, top + 260], [x - 10, foot - 60]], shade(THREAD.bark, -0.3), 2.4, [14, 9])
  // The crown: clumps of leaves, each stitched its own way.
  const clumps: [number, number, number, number, string][] = [
    [x - 96, top + 96, 92, 66, THREAD.leafDark],
    [x + 96, top + 104, 96, 64, THREAD.leafDark],
    [x - 40, top + 30, 104, 72, THREAD.leaf],
    [x + 58, top + 34, 98, 70, THREAD.leaf],
    [x + 6, top + 104, 118, 74, THREAD.leafLight],
  ]
  clumps.forEach(([cx, cy, rx, ry, colour], i) => {
    satin(g, (c) => oval(c, cx, cy, rx, ry, (next() - 0.5) * 0.5), { x: cx - rx, y: cy - rx, w: rx * 2, h: rx * 2 }, colour, 0.5 + i * 0.7, seed + i, 3.4)
  })
  seeds(g, { x: x - 170, y: top - 30, w: 340, h: 200 }, 70, shade(THREAD.leafLight, 0.15), seed + 9, 9, 2.6)
  for (let n = 0; n < 6; n++) knot(g, x - 130 + next() * 260, top + 30 + next() * 130, 7, THREAD.apple)
}

function picket(g: Ctx, x: number, top: number, foot: number, w: number, seed: number): void {
  const points: Pt[] = [[x - w / 2, top + 14], [x, top], [x + w / 2, top + 14], [x + w / 2, foot], [x - w / 2, foot]]
  satin(g, (c) => soft(c, points, 0.12), { x: x - w / 2, y: top, w, h: foot - top }, THREAD.fence, Math.PI / 2, seed, 3.3)
  soft(g, points, 0.12)
  g.lineWidth = 2.2
  g.strokeStyle = THREAD.fenceLine
  g.setLineDash([7, 5])
  g.stroke()
  g.setLineDash([])
}

function flower(g: Ctx, x: number, y: number, colour: string, r: number): void {
  stitch(g, x, y + r, x + 1, y + r * 4.4, THREAD.leafDark, 2.6)
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2 - 0.3
    knot(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.62, colour)
  }
  knot(g, x, y, r * 0.55, THREAD.sun)
}

/** Paints the still yard. `g` is already in stage units; `reach` says how far past the stage the surface shows. */
export function paintYard(g: Ctx, reach: Reach): void {
  // No seed stitch of this picture may cross another: the scatters below all lay into one record.
  beginSeeds()
  const left = -reach.left, right = STAGE.width + reach.right, bottom = STAGE.height + reach.bottom
  const wide = right - left

  // The sky is the bare linen, with a sun and two clouds stitched on it.
  satin(g, (c) => oval(c, 742, 96, 40, 40), { x: 702, y: 56, w: 80, h: 80 }, THREAD.sun, 0.7, 3, 3.2)
  for (let n = 0; n < 12; n++) {
    const a = (n / 12) * Math.PI * 2 + 0.13
    stitch(g, 742 + Math.cos(a) * 50, 96 + Math.sin(a) * 50, 742 + Math.cos(a) * (n % 2 ? 64 : 72), 96 + Math.sin(a) * (n % 2 ? 64 : 72), THREAD.sun, 3.6)
  }
  cloud(g, 372, 92, 190, 11)
  cloud(g, 930, 196, 150, 12)
  cloud(g, 566, 222, 110, 13)

  // The far hill, with a house on it and a lane that comes down to the gate.
  const hill: Pt[] = [[left, 372], [left, 318], [180, 262], [470, 226], [760, 250], [1010, 300], [right, 290], [right, 372]]
  satin(g, (c) => soft(c, hill, 0.4), { x: left, y: 216, w: wide, h: 170 }, THREAD.hill, -0.12, 21, 3.6)
  // The lane: up from the gate through the hedge and along the brow of the hill, where those who walked off stand.
  running(g, [[1022, 372], [1014, 344], [980, 326], [900, 322], [800, 318], [700, 316], [600, 318], [540, 322]], THREAD.lane, 6, [12, 7])
  running(g, [[1034, 372], [1026, 348], [988, 334], [900, 330], [800, 326], [700, 324], [600, 326], [540, 330]], shade(THREAD.lane, -0.25), 2, [6, 9])
  satin(g, (c) => soft(c, [[254, 202], [314, 202], [314, 248], [254, 248]], 0.08), { x: 254, y: 202, w: 60, h: 46 }, THREAD.wall, Math.PI / 2, 22, 3)
  satin(g, (c) => soft(c, [[244, 206], [284, 170], [324, 206]], 0.1), { x: 244, y: 170, w: 80, h: 36 }, THREAD.roof, 0.6, 23, 3)
  knot(g, 270, 224, 5, THREAD.sky)
  knot(g, 298, 224, 5, THREAD.sky)
  stitch(g, 284, 230, 284, 248, THREAD.bark, 6)
  for (const [x, y, r] of [[150, 262, 15], [178, 250, 19], [206, 262, 14], [440, 232, 16], [466, 222, 20], [1076, 286, 15]] as const) {
    stitch(g, x, y + r, x, y + r + 12, THREAD.bark, 4)
    knot(g, x, y, r, THREAD.leafDark)
  }
  seeds(g, { x: left, y: 270, w: wide, h: 60 }, 120, shade(THREAD.hill, -0.18), 24, 8, 2.4)

  // The hedge, with the fence and the gate in front of it.
  const hedgeTop: Pt[] = [[left, 452]]
  const bumps = wobbler(31)
  for (let x = left; x <= right + 60; x += 58) hedgeTop.push([x, 322 + bumps() * 26])
  hedgeTop.push([right, 452])
  g.save()
  soft(g, hedgeTop, 0.5)
  g.clip()
  turf(g, { x: left, y: 300, w: wide, h: 152 }, THREAD.hedge, 32, 13, 3.6)
  seeds(g, { x: left, y: 318, w: wide, h: 120 }, Math.round(wide / 3.2), THREAD.hedgeLeaf, 33, 10, 3)
  g.restore()
  const blooms = wobbler(34)
  for (let n = 0; n < Math.round(wide / 34); n++) knot(g, left + blooms() * wide, 348 + blooms() * 44, 4.5 + blooms() * 2.5, ['#f3d4dc', '#fbf6e9', '#e88ca0'][n % 3])

  stitch(g, left, 398, right, 398, THREAD.fenceLine, 7)
  stitch(g, left, 432, right, 432, THREAD.fenceLine, 7)
  // The lane shows through the hedge behind the gate.
  satin(g, (c) => soft(c, [[GATE.x + 40, 452], [GATE.x + 96, 330], [GATE.x + 170, 330], [GATE.x + GATE.w - 30, 452]], 0.2), { x: GATE.x, y: 330, w: GATE.w, h: 122 }, THREAD.lane, 0.1, 36, 3.4)
  for (let x = left + ((414 - left) % 44); x < right; x += 44) {
    if (x > GATE.x - 20 && x < GATE.x + GATE.w + 20) continue
    if (Math.abs(x - CAT.x) < 26) continue
    picket(g, x, 366, 452, 26, 40 + Math.round(x))
  }
  // The posts: the cat's, and the two the gate hangs between.
  const post = (x: number, top: number, w: number) => {
    satin(g, (c) => soft(c, [[x - w, top], [x + w, top], [x + w, 458], [x - w, 458]], 0.15), { x: x - w, y: top, w: w * 2, h: 458 - top }, shade(THREAD.fence, -0.12), Math.PI / 2, 70 + x, 3.3)
    running(g, [[x - w, top + 2], [x + w, top + 2], [x + w, 458], [x - w, 458]], THREAD.fenceLine, 2.4, [7, 5], true)
  }
  post(CAT.x, CAT.y + CAT.seat, 17)
  post(GATE.x - 12, 350, 13)
  post(GATE.x + GATE.w + 12, 350, 13)
  knot(g, GATE.x - 12, 344, 9, THREAD.fenceLine)
  knot(g, GATE.x + GATE.w + 12, 344, 9, THREAD.fenceLine)

  // The lawn, down to the bottom edge and past it.
  turf(g, { x: left, y: 446, w: wide, h: bottom - 446 }, THREAD.grass, 51, 17, 3.7)
  seeds(g, { x: left, y: 452, w: wide, h: bottom - 452 }, Math.round(wide * 0.5), THREAD.grassDark, 52, 12, 2.6)
  seeds(g, { x: left, y: 452, w: wide, h: bottom - 452 }, Math.round(wide * 0.2), shade(THREAD.grass, 0.25), 53, 10, 2.4)
  const meadow = wobbler(54)
  const flowers: [number, number, string][] = [[36, 742, '#fbf6e9'], [96, 772, '#e88ca0'], [318, 760, '#fbf6e9'], [612, 764, '#f3d4dc'], [706, 780, '#fbf6e9'], [884, 772, '#e88ca0'], [1064, 760, '#fbf6e9'], [1136, 714, '#f3d4dc'], [1150, 786, '#fbf6e9'], [540, 470, '#fbf6e9'], [690, 462, '#e88ca0'], [900, 466, '#fbf6e9'], [1090, 474, '#f3d4dc']]
  for (const [x, y, colour] of flowers) flower(g, x, y, colour, 5.5 + meadow() * 2)

  // The two trees the line hangs between, and the hooks it hangs from.
  tree(g, 58, -18, 742, 81)
  tree(g, 1168, 4, 452, 82)
  knot(g, LINE.x0, LINE.y, 6, THREAD.hoop)
  knot(g, LINE.x1, LINE.y, 6, THREAD.hoop)

  // The wringing rail, from the tree to a post of its own, behind the tub.
  satin(g, (c) => soft(c, [[RAIL.x1 - 9, RAIL.y - 12], [RAIL.x1 + 9, RAIL.y - 12], [RAIL.x1 + 9, 600], [RAIL.x1 - 9, 600]], 0.2), { x: RAIL.x1 - 9, y: RAIL.y - 12, w: 18, h: 612 - RAIL.y }, THREAD.woodDark, Math.PI / 2, 86, 3.3)
  satin(g, (c) => soft(c, [[RAIL.x0, RAIL.y - 8], [RAIL.x1 + 12, RAIL.y - 8], [RAIL.x1 + 12, RAIL.y + 8], [RAIL.x0, RAIL.y + 8]], 0.3), { x: RAIL.x0, y: RAIL.y - 8, w: RAIL.x1 - RAIL.x0 + 12, h: 16 }, THREAD.wood, 0, 87, 3.3)
  chain(g, [[RAIL.x0, RAIL.y - 8], [RAIL.x1 + 12, RAIL.y - 8], [RAIL.x1 + 12, RAIL.y + 8], [RAIL.x0, RAIL.y + 8]], shade(THREAD.woodDark, -0.35), true, 6)
  // The soap's dish, on the top of the board.
  satin(g, (c) => oval(c, SOAP.x, SOAP.y + 14, 40, 12), { x: SOAP.x - 40, y: SOAP.y + 2, w: 80, h: 24 }, THREAD.sky, 0, 88, 3)
  chain(g, ring(SOAP.x, SOAP.y + 14, 40, 12, 24), shade(THREAD.sky, -0.4), true, 5)

  // The inside of the tub and its water. The board and the front of the tub are pieces of their own.
  satin(g, (c) => oval(c, TUB.x, TUB.y, TUB.rx, TUB.ry), { x: TUB.x - TUB.rx, y: TUB.y - TUB.ry, w: TUB.rx * 2, h: TUB.ry * 2 }, THREAD.tubInside, Math.PI / 2, 91, 3.6)
  satin(g, (c) => oval(c, TUB.x, TUB.y + 9, TUB.rx - 12, TUB.ry - 9), { x: TUB.x - TUB.rx, y: TUB.y - TUB.ry, w: TUB.rx * 2, h: TUB.ry * 2 + 9 }, THREAD.water, 0, 92, 3.4)
}

/** The frame round the whole cloth, as a sampler has: two rows of running stitch. `g` is in the surface's own pixels times `k`. */
export function paintBorder(g: Ctx, width: number, height: number, k: number): void {
  const frame = (inset: number): Pt[] => [[inset, inset], [width - inset, inset], [width - inset, height - inset], [inset, height - inset]]
  running(g, frame(9 * k), THREAD.border, 3.4 * k, [11 * k, 7 * k], true)
  running(g, frame(17 * k), THREAD.borderIn, 2.4 * k, [5 * k, 8 * k], true)
}

/** The linen under everything, in device pixels. */
export function paintLinen(g: Ctx, width: number, height: number, scale: number): void {
  const pattern = g.createPattern(linenTile(scale, THREAD.linen), 'repeat')
  g.fillStyle = pattern ?? THREAD.linen
  g.fillRect(0, 0, width, height)
}

/** The washboard: plain pale wood, and nothing on it but its ridges. Painted in a box the size of `BOARD`. */
export function paintBoard(g: Ctx): void {
  const { w, h } = BOARD
  g.fillStyle = THREAD.wood
  soft(g, [[6, 4], [w - 6, 4], [w - 2, h], [2, h]], 0.06)
  g.fill()
  // The two legs and the top bar are the frame.
  for (const x of [0, w - 16]) satin(g, (c) => soft(c, [[x, 0], [x + 16, 0], [x + 16, h], [x, h]], 0.2), { x, y: 0, w: 16, h }, THREAD.woodDark, Math.PI / 2, 5 + x, 3.4)
  satin(g, (c) => soft(c, [[0, 0], [w, 0], [w, 26], [0, 26]], 0.3), { x: 0, y: 0, w, h: 26 }, THREAD.woodDark, 0, 7, 3.4)
  const x0 = RIDGES.x - BOARD.x, y0 = RIDGES.y - BOARD.y
  for (let y = 0; y <= RIDGES.h; y += RIDGES.gap) {
    g.lineWidth = 5
    g.strokeStyle = shade(THREAD.wood, -0.24)
    g.beginPath()
    g.moveTo(x0, y0 + y)
    g.lineTo(x0 + RIDGES.w, y0 + y)
    g.stroke()
    g.lineWidth = 2
    g.strokeStyle = shade(THREAD.wood, 0.6)
    g.beginPath()
    g.moveTo(x0, y0 + y - 3.5)
    g.lineTo(x0 + RIDGES.w, y0 + y - 3.5)
    g.stroke()
  }
}

/** The front of the tub: staves and two hoops, with the chain outline of a thing that answers a touch. Painted in a box `TUB.rx * 2 + 20` wide. */
export function paintTubFront(g: Ctx): void {
  const cx = TUB.rx + 10, top = 10
  const rim: Pt[] = Array.from({ length: 21 }, (_, i): Pt => {
    const a = Math.PI - (i / 20) * Math.PI
    return [cx + Math.cos(a) * TUB.rx, top + Math.sin(a) * TUB.ry]
  })
  const base: Pt[] = Array.from({ length: 21 }, (_, i): Pt => {
    const a = (i / 20) * Math.PI
    return [cx + Math.cos(a) * TUB.rx * 0.9, top + TUB.depth + Math.sin(a) * TUB.ry * 0.8]
  })
  const shape = (c: Ctx) => {
    c.beginPath()
    c.moveTo(cx - TUB.rx, top)
    rim.forEach(([x, y]) => c.lineTo(x, y))
    base.forEach(([x, y]) => c.lineTo(x, y))
    c.closePath()
  }
  satin(g, shape, { x: 10, y: top, w: TUB.rx * 2, h: TUB.depth + TUB.ry }, THREAD.tub, Math.PI / 2, 95, 3.6)
  g.save()
  shape(g)
  g.clip()
  for (let x = cx - TUB.rx + 34; x < cx + TUB.rx; x += 36) running(g, [[x, top], [x + (x - cx) * -0.08, top + TUB.depth + TUB.ry]], shade(THREAD.tub, -0.4), 2.4, [10, 7])
  for (const drop of [34, 86]) {
    const hoop: Pt[] = Array.from({ length: 25 }, (_, i): Pt => {
      const a = Math.PI - (i / 24) * Math.PI, k = 1 - (drop / TUB.depth) * 0.1
      return [cx + Math.cos(a) * TUB.rx * k, top + drop + Math.sin(a) * TUB.ry * (1 - (drop / TUB.depth) * 0.2)]
    })
    g.beginPath()
    hoop.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
    g.lineWidth = 9
    g.strokeStyle = THREAD.hoop
    g.stroke()
    g.lineWidth = 2.4
    g.strokeStyle = shade(THREAD.hoop, 0.45)
    g.stroke()
  }
  g.restore()
  chain(g, [[cx - TUB.rx, top], ...rim, ...base], shade(THREAD.tub, -0.45), true, 8)
}

/** The puddle: a pool of mud with a wet shine. Painted in a box `PUDDLE.rx * 2 + 24` by `PUDDLE.ry * 2 + 24`. */
export function paintPuddle(g: Ctx): void {
  const cx = PUDDLE.rx + 12, cy = PUDDLE.ry + 12
  const edge = wobbler(61)
  const lip: Pt[] = ring(cx, cy, PUDDLE.rx, PUDDLE.ry, 18).map(([x, y]): Pt => [x + (edge() - 0.5) * 12, y + (edge() - 0.5) * 6])
  satin(g, (c) => soft(c, lip, 0.5), { x: 0, y: 0, w: cx * 2, h: cy * 2 }, THREAD.mud, 0, 62, 3.2)
  satin(g, (c) => oval(c, cx - 8, cy - 2, PUDDLE.rx * 0.6, PUDDLE.ry * 0.5), { x: 0, y: 0, w: cx * 2, h: cy * 2 }, THREAD.mudLight, 0, 63, 3.2)
  running(g, [[cx - 40, cy - 6], [cx - 14, cy - 9], [cx + 6, cy - 6]], shade(THREAD.mudLight, 0.45), 2.6, [9, 6])
  knot(g, cx + 30, cy + 2, 5, THREAD.mudLight)
  knot(g, cx + 44, cy - 4, 3.5, THREAD.mudLight)
  chain(g, softPoints(lip, 0.5), shade(THREAD.mud, -0.3), true, 7)
}

/** The gate: a top bar, boards below it and a brace. Painted in a box `GATE.w + 16` by `GATE.h + 20`, with the top bar's upper edge 8 down. */
export function paintGate(g: Ctx): void {
  const w = GATE.w, h = GATE.h
  for (let n = 0; n < 8; n++) {
    const x = 8 + 6 + n * ((w - 12) / 8)
    satin(g, (c) => soft(c, [[x, 14], [x + 24, 14], [x + 24, 8 + h], [x, 8 + h]], 0.12), { x, y: 14, w: 24, h: h - 6 }, THREAD.fence, Math.PI / 2, 60 + n, 3.3)
    running(g, [[x, 14], [x + 24, 14], [x + 24, 8 + h], [x, 8 + h]], THREAD.fenceLine, 2.2, [7, 5], true)
  }
  stitch(g, 16, h - 4, w, 30, THREAD.fenceLine, 5)
  satin(g, (c) => soft(c, [[4, 4], [w + 12, 4], [w + 12, 22], [4, 22]], 0.3), { x: 4, y: 4, w: w + 8, h: 18 }, shade(THREAD.fence, -0.1), 0, 68, 3.3)
  chain(g, [[4, 4], [w + 12, 4], [w + 12, 12 + h], [4, 12 + h]], THREAD.fenceLine, true, 7)
  knot(g, 22, 50, 6, THREAD.hoop)
}

/** The bar of soap. Painted in a box 64 by 44. */
export function paintSoap(g: Ctx): void {
  const bar: Pt[] = [[8, 12], [56, 8], [58, 32], [10, 36]]
  satin(g, (c) => soft(c, bar, 0.35), { x: 6, y: 6, w: 54, h: 32 }, '#f6d7e3', 0.2, 97, 3)
  chain(g, softPoints(bar, 0.35), '#b0718c', true, 6)
  knot(g, 24, 18, 3, '#ffffff')
}
