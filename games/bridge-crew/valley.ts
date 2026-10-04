import { TRAY, bays, tools } from './layout'
import { INK, stream, type Pen } from './look'
import { WATER } from './pose'
import { MARGIN, groundAt, px, type Plot } from './sheet'
import { COLS, ROWS, type Site } from './sites'

// The place the gap is in, drawn on the sheet in the drafting line: far hills
// with a finished bridge on them, trees and a fence along the banks, what lies
// buried in the cut ground, and the draughtsman's own things along the bottom
// of the sheet. All of it is painted once into the still sheet and is fainter
// than anything a finger can move. What moves at the edge (clouds, the far
// train, the fish, the paper boat, the steam) is in `drift.ts`.
//
// Nothing here is a word, a letter or a figure, and nothing here answers a touch.

/** How strong the setting's line is, against 1 for the ground's outline: it never competes with a part. */
export const FAINT = { far: 0.24, hills: 0.3, trees: 0.46, fence: 0.34, finds: 0.5, desk: 0.42 } as const

/** A number for a sheet, so that each position has its own valley and has it every time. */
export const siteSeed = (at: Site): number => {
  let seed = 17 + at.variant * 101
  for (const letter of at.id) seed = (seed * 31 + letter.charCodeAt(0)) >>> 0
  return seed
}

type Dot = readonly [number, number]

/** Keeps what was worked out for a sheet, so that a frame asks for it and does not work it out again. */
function kept<T>(make: (at: Site) => T): (at: Site) => T {
  const known = new WeakMap<Site, { value: T }>()
  return (at) => {
    let had = known.get(at)
    if (!had) { had = { value: make(at) }; known.set(at, had) }
    return had.value
  }
}

function stroke(pen: Pen, plot: Plot, points: readonly Dot[], width: number, alpha: number, close = false) {
  pen.strokeStyle = INK.line
  pen.globalAlpha = alpha
  pen.lineWidth = Math.max(0.75, plot.cell * width)
  pen.lineCap = 'round'
  pen.lineJoin = 'round'
  pen.beginPath()
  points.forEach(([x, y], i) => { const [sx, sy] = px(plot, x, y); if (i) pen.lineTo(sx, sy); else pen.moveTo(sx, sy) })
  if (close) pen.closePath()
  pen.stroke()
  pen.globalAlpha = 1
}

function ring(pen: Pen, plot: Plot, x: number, y: number, r: number, width: number, alpha: number, from = 0, to = Math.PI * 2) {
  const [sx, sy] = px(plot, x, y)
  pen.strokeStyle = INK.line
  pen.globalAlpha = alpha
  pen.lineWidth = Math.max(0.75, plot.cell * width)
  pen.beginPath(); pen.arc(sx, sy, r * plot.cell, from, to); pen.stroke()
  pen.globalAlpha = 1
}

/** The far hills over one bank: how high the skyline stands above the deck at x. It falls away to nothing toward the gap, so the sky over the gap stays clear for the bridge. */
export function skyline(at: Site, x: number, layer: 0 | 1): number {
  const seed = siteSeed(at) % 97, lip = at.left[0], far = at.right[0]
  const off = x < (lip + far) / 2 ? lip - 0.5 - x : x - far - 0.5
  if (off <= 0) return 0
  const rise = Math.min(1, off / (layer ? 3.2 : 2.2))
  const roll = 0.55 * Math.sin(x * (layer ? 0.83 : 0.57) + seed) + 0.3 * Math.sin(x * (layer ? 1.9 : 1.37) + seed * 1.7)
  return rise * rise * (3 - 2 * rise) * ((layer ? 1.25 : 2.1) + roll)
}

/** Where the finished bridge far off stands: over the far bank, between two hills. Its rail's two ends and its height above the deck, in cells. */
export function farBridge(at: Site): { x0: number; x1: number; y: number } {
  // Clear of a cliff that stands behind the far bank: it begins beyond the cliff's foot.
  const cliff = Math.max(-Infinity, ...at.anchors.filter(([ax]) => ax > at.right[0]).map(([ax]) => ax + 2.1))
  const x0 = Math.max(Math.min(at.right[0] + 2.4, COLS - 3.6), Math.min(cliff, COLS - 1.9)), x1 = Math.min(x0 + 4.6, COLS + 0.9)
  return { x0, x1, y: at.right[1] + 2.75 }
}

/** The house on the hills over the near bank: where the foot of its chimney is, in cells, or null on a sheet whose near bank is too short for a hill to stand on, or whose road is so high that the hill would put the house behind the chief. Smoke rises from the chimney (drift.ts). */
export const hillHouse = kept((at: Site): readonly [number, number] | null => {
  const x = at.left[0] - 5.2
  if (x < 0.8) return null
  const roof = at.left[1] + Math.max(skyline(at, x, 0), skyline(at, x, 1)) + 0.75
  if (x - 0.8 < CHIEF_MARGIN.right && roof + 1.3 > CHIEF_MARGIN.low) return null
  return [x + 0.22, roof]
})
/** The corner of the sheet the chief and its model stand in: left of this x and above this y, in cells (toy.ts has the chief's own place). */
export const CHIEF_MARGIN = { right: 5.6, low: 10.5 } as const

/** The trees along a bank, behind the road: where each stands, how tall, and which kind. Clear of the lips and of the cliffs. */
export function trees(at: Site): { x: number; tall: number; kind: 'round' | 'pine' | 'poplar' | 'bush' }[] {
  const random = stream(siteSeed(at) + 5), out: { x: number; tall: number; kind: 'round' | 'pine' | 'poplar' | 'bush' }[] = []
  // Where vehicles wait or park, two deep, there are only bushes: no trunk stands as high as a numeral beside one.
  const lineUp = (x: number) => (x > at.left[0] - LINE_UP && x < at.left[0]) || (x < at.right[0] + LINE_UP && x > at.right[0])
  const stretch = (from: number, to: number) => {
    // Bushes stand closer together than trees: the stretch by the gap has nothing taller, and is not left bare.
    for (let x = from + 0.4 + random() * 0.8; x < to; x += lineUp(x) ? 0.75 + random() * 0.8 : 1.5 + random() * 1.5) {
      const pick = random(), tall = 1.5 + random() * 1.3
      if (at.anchors.some(([ax]) => Math.abs(ax - x) < 2.3)) continue
      // And clear of the house, which stands on the hill behind.
      if (hillHouse(at) && Math.abs(x - (at.left[0] - 5.2)) < 1.3) continue
      out.push(lineUp(x) ? { x, tall: 0.36 + 0.14 * random(), kind: 'bush' } : { x, tall, kind: pick < 0.45 ? 'round' : pick < 0.8 ? 'pine' : 'poplar' })
    }
  }
  stretch(-MARGIN.side + 0.2, at.left[0] - 1.4)
  stretch(at.right[0] + 1.4, COLS + MARGIN.side - 0.6)
  return out
}
/** How far back from a lip vehicles stand, two deep, with their numerals: no tree with a trunk grows there. */
export const LINE_UP = 8.4

function tree(pen: Pen, plot: Plot, x: number, base: number, tall: number, kind: 'round' | 'pine' | 'poplar' | 'bush', random: () => number) {
  const a = FAINT.trees
  if (kind === 'bush') {
    // A bush: a low hump of scallops that sits on the ground, with no stem.
    // Every scallop stays above the ground, and the whole is lower than the foot of a numeral beside a vehicle.
    for (let i = 0; i < 5; i++) { const t = (i / 4) * Math.PI; ring(pen, plot, x + Math.cos(t) * tall * 0.62, base + Math.sin(t) * tall * 0.62, tall * 0.34, 0.022, a, Math.max(-Math.PI, -t - 1.5), Math.min(0, -t + 1.5)) }
    return
  }
  // Only the round tree shows a trunk. A pine's lowest tier and a poplar's leaf come down to the ground: a stem
  // under tiers reads as an arrow, and under a tall narrow leaf as a figure on a stick.
  if (kind === 'round') stroke(pen, plot, [[x, base], [x + 0.03, base + tall * 0.42]], 0.035, a)
  if (kind === 'round') {
    // A crown drawn as an architect draws one: a ring of scallops and two loose arcs inside.
    const r = tall * 0.34, cy = base + tall * 0.66, lobes = 9
    for (let i = 0; i < lobes; i++) {
      const t = (i / lobes) * Math.PI * 2 + random() * 0.2
      ring(pen, plot, x + Math.cos(t) * r * 0.78, cy + Math.sin(t) * r * 0.72, r * 0.36, 0.022, a, -t - 1.7, -t + 1.7)
    }
    ring(pen, plot, x - r * 0.15, cy + r * 0.1, r * 0.4, 0.016, a * 0.7, 3.4, 5.4)
    ring(pen, plot, x + r * 0.2, cy - r * 0.15, r * 0.3, 0.016, a * 0.7, 3.6, 5.6)
    stroke(pen, plot, [[x + 0.02, base + tall * 0.36], [x - r * 0.4, base + tall * 0.56]], 0.022, a)
  } else if (kind === 'pine') {
    // Three tiers, each a little narrower. The trunk stops under the lowest: nothing is drawn through them.
    for (let i = 0; i < 3; i++) {
      const low = base + tall * (0.02 + 0.31 * i), wide = tall * (0.3 - 0.07 * i)
      stroke(pen, plot, [[x - wide, low], [x, low + tall * 0.34], [x + wide, low], [x + wide * 0.45, low + tall * 0.03], [x - wide * 0.45, low + tall * 0.03]], 0.022, a, true)
    }
  } else {
    // A poplar: one tall narrow leaf, with nothing drawn through it.
    const wide = tall * 0.14, steps = 10, left: Dot[] = [], right: Dot[] = []
    // A flame of a tree: broad low down and drawn out to a point, leaning a little, so it is no closed round.
    for (let i = 0; i <= steps; i++) { const t = i / steps, w = wide * Math.sin(Math.PI * Math.pow(t, 0.45)) * (1 - 0.6 * t * t), lean = 0.05 * tall * t * t; left.push([x - w + lean, base + tall * (0.02 + 0.98 * t)]); right.unshift([x + w * 0.8 + lean, base + tall * (0.02 + 0.98 * t)]) }
    stroke(pen, plot, [...left, ...right], 0.022, a, true)
  }
}

/** What stands behind the road: the far hills with the finished bridge on them, the trees, tufts of grass and a fence along each bank. Painted before the cliffs and the ground. */
export function paintValley(pen: Pen, plot: Plot, at: Site) {
  const random = stream(siteSeed(at)), deck = at.left[1], lip = at.left[0], far = at.right[0]
  // The lay-by on the far bank, where a vehicle that has crossed parks: a paved strip lying on the bank's top, a
  // little paler than the sheet. Filled, with no outline.
  {
    const [x0, y0] = px(plot, far + 0.5, deck + 0.09), [x1, y1] = px(plot, Math.min(COLS + MARGIN.side - 0.1, far + LINE_UP), deck)
    pen.fillStyle = INK.line
    pen.globalAlpha = 0.13
    pen.beginPath(); pen.roundRect(x0, y0, x1 - x0, y1 - y0, plot.cell * 0.03); pen.fill()
    pen.globalAlpha = 1
  }
  // Two skylines over each bank, the further one fainter and with ticks of contour on its flanks.
  for (const layer of [1, 0] as const) {
    for (const [from, to] of [[-MARGIN.side, lip - 0.5], [far + 0.5, COLS + MARGIN.side]] as const) {
      const line: Dot[] = []
      for (let x = from; x <= to + 0.001; x += 0.25) line.push([x, deck + skyline(at, x, layer)])
      stroke(pen, plot, line, layer ? 0.016 : 0.022, layer ? FAINT.far : FAINT.hills)
      if (layer === 0) for (let x = from + 0.6; x < to - 0.3; x += 0.9 + random() * 0.6) {
        const top = skyline(at, x, 0)
        // None behind where vehicles stand with their numerals: a short level stroke there would stand beside a numeral.
        const a0 = random(), a1 = random(), behind = (x > lip - LINE_UP - 0.4 && x < lip) || (x > far - 0.4 && x < far + LINE_UP)
        if (top > 0.9 && !behind) stroke(pen, plot, [[x, deck + top * (0.45 + 0.3 * a0)], [x + 0.32, deck + top * (0.4 + 0.3 * a1)]], 0.014, FAINT.far)
      }
    }
  }
  // The finished bridge, far off: a level rail on a row of round arches, and a tower at each end. Somebody else's.
  const span = farBridge(at)
  if (span.x1 - span.x0 > 2.5) {
    const rail = span.y, arches = Math.round((span.x1 - span.x0) / 0.62), wide = (span.x1 - span.x0) / arches
    stroke(pen, plot, [[span.x0 - 0.2, rail], [span.x1 + 0.2, rail]], 0.02, FAINT.hills + 0.08)
    for (let i = 0; i < arches; i++) {
      const cx = span.x0 + wide * (i + 0.5), foot = deck + Math.max(skyline(at, cx - wide / 2, 0), skyline(at, cx - wide / 2, 1))
      ring(pen, plot, cx, rail - 0.09 - wide * 0.42, wide * 0.42, 0.014, FAINT.hills, Math.PI, Math.PI * 2)
      if (foot < rail - 0.09 - wide * 0.42) stroke(pen, plot, [[cx - wide / 2, rail - 0.09 - wide * 0.42], [cx - wide / 2, foot]], 0.014, FAINT.hills)
    }
    for (const x of [span.x0, span.x1]) stroke(pen, plot, [[x - 0.09, rail], [x - 0.09, rail + 0.42], [x, rail + 0.56], [x + 0.09, rail + 0.42], [x + 0.09, rail]], 0.014, FAINT.hills)
  }
  // A house on the hill: four walls, a roof with a chimney at one end, a door and a window. Its smoke is drawn live.
  const house = hillHouse(at)
  if (house) {
    const [cx, roof] = house, hx = cx - 0.22, foot = roof - 0.75, a = FAINT.hills + 0.06
    stroke(pen, plot, [[hx - 0.42, foot], [hx - 0.42, foot + 0.4], [hx + 0.42, foot + 0.4], [hx + 0.42, foot]], 0.02, a)
    stroke(pen, plot, [[hx - 0.5, foot + 0.4], [hx - 0.3, foot + 0.72], [hx + 0.3, foot + 0.72], [hx + 0.5, foot + 0.4]], 0.02, a)
    stroke(pen, plot, [[cx - 0.06, foot + 0.72], [cx - 0.06, roof + 0.12], [cx + 0.06, roof + 0.12], [cx + 0.06, foot + 0.72]], 0.016, a)
    stroke(pen, plot, [[hx - 0.3, foot], [hx - 0.3, foot + 0.26], [hx - 0.14, foot + 0.26], [hx - 0.14, foot]], 0.014, FAINT.hills)
    stroke(pen, plot, [[hx + 0.08, foot + 0.12], [hx + 0.08, foot + 0.28], [hx + 0.28, foot + 0.28], [hx + 0.28, foot + 0.12]], 0.014, FAINT.hills, true)
  }
  // Trees, behind the road.
  for (const one of trees(at)) tree(pen, plot, one.x, deck, one.tall, one.kind, random)
  // Posts along each bank, behind the road, with a rope slung from top to top, which stops short of the lip with its
  // last length hanging. No rail crosses a post.
  // None where vehicles wait or park: a post is an upright stroke, and would stand beside a numeral there.
  for (const [from, to, toward] of [[-MARGIN.side + 0.1, lip - LINE_UP, 1], [far + LINE_UP, COLS + MARGIN.side - 0.1, -1]] as const) {
    const posts: number[] = []
    for (let x = toward > 0 ? to : from; toward > 0 ? x > from : x < to; x -= toward * 0.85) posts.push(x)
    posts.forEach((x, i) => {
      stroke(pen, plot, [[x, deck], [x, deck + 0.42]], 0.024, FAINT.fence)
      const next = posts[i + 1]
      if (next !== undefined) { const rope: Dot[] = []; for (let t = 0; t <= 1.001; t += 0.125) rope.push([x + (next - x) * t, deck + 0.42 - 0.14 * Math.sin(Math.PI * t)]); stroke(pen, plot, rope, 0.014, FAINT.fence) }
    })
    if (posts.length) stroke(pen, plot, [[posts[0], deck + 0.42], [posts[0] + toward * 0.12, deck + 0.2], [posts[0] + toward * 0.16, deck + 0.04]], 0.014, FAINT.fence)
  }
  // Grass: tufts of two blades, each curving its own way from its own foot. (Strokes fanning from one point are rays.)
  for (let x = -MARGIN.side + 0.3; x < COLS + MARGIN.side; x += 0.5 + random() * 0.9) {
    if (x > lip - 0.9 && x < far + 0.9) continue
    for (const lean of [-0.08, 0.09]) { const tall = 0.1 + 0.07 * random(); stroke(pen, plot, [[x + lean * 0.9, deck], [x + lean * 1.1, deck + tall * 0.55], [x + lean * 1.9, deck + tall]], 0.014, FAINT.fence) }
  }
}

/** What lies in the cut ground under a bank: each a small drawing of its own, with the hatching cleared behind it. */
export type Find = 'shell' | 'bottle' | 'boot' | 'pot' | 'chest' | 'burrow'

/** The finds of a sheet: a burrow under the near bank on every sheet, and two or three other things, each well inside a bank and under the road. */
export function finds(at: Site): { what: Find; x: number; y: number }[] {
  const random = stream(siteSeed(at) + 11), deck = at.left[1], out: { what: Find; x: number; y: number }[] = []
  const others: Find[] = ['shell', 'bottle', 'boot', 'pot', 'chest']
  const room = (from: number, to: number): number[] => { const xs: number[] = []; for (let x = from + 1.35; x < to - 0.9; x += 2.3) xs.push(x); return xs }
  const near = room(-MARGIN.side + 0.3, at.left[0] - 0.4), away = room(at.right[0] + 0.4, COLS + MARGIN.side - 0.3)
  if (near.length) out.push({ what: 'burrow', x: near[0], y: deck - 1.9 })
  // The rest turn about between the far bank and the near one, so neither is left bare: five at most.
  const rest = near.slice(1), places: number[] = []
  for (let i = 0; i < Math.max(rest.length, away.length); i++) { if (away[i] !== undefined) places.push(away[i]); if (rest[i] !== undefined) places.push(rest[i]) }
  for (const x of places) {
    if (out.length >= 5 || others.length === 0) break
    const pick = others.splice(Math.floor(random() * others.length), 1)[0]
    out.push({ what: pick, x: x + (random() - 0.5) * 0.6, y: 0.9 + random() * Math.max(0.2, deck - 2.6) })
  }
  return out
}

function find(pen: Pen, plot: Plot, what: Find, x: number, y: number) {
  const a = FAINT.finds, [sx, sy] = px(plot, x, y), c = plot.cell
  // The hatching stops round it, as it does round anything drawn in a section.
  pen.fillStyle = INK.sheet
  pen.globalAlpha = 0.92
  pen.beginPath(); pen.ellipse(sx, sy, c * (what === 'burrow' ? 1.0 : 0.62), c * (what === 'burrow' ? 0.62 : 0.46), 0, 0, Math.PI * 2); pen.fill()
  pen.globalAlpha = 1
  const at = (dx: number, dy: number): Dot => [x + dx, y + dy]
  switch (what) {
    case 'shell': {
      // A clam shell, lying flat: a low dome with a scalloped edge and a hinge. No coil: a spiral reads as a figure.
      const dome: Dot[] = []
      for (let t = 0; t <= 1.001; t += 0.1) dome.push(at(-0.3 + 0.6 * t, -0.14 + 0.36 * Math.sin(Math.PI * t)))
      stroke(pen, plot, dome, 0.02, a)
      for (let i = 0; i < 5; i++) ring(pen, plot, x - 0.24 + 0.12 * i, y - 0.14, 0.06, 0.016, a, 0, Math.PI)
      stroke(pen, plot, [at(-0.07, 0.2), at(0, 0.27), at(0.07, 0.2)], 0.016, a)
      break
    }
    case 'bottle':
      // An old bottle on its side: a body, a shoulder and a neck, in one outline.
      stroke(pen, plot, [at(-0.36, -0.12), at(0.08, -0.12), at(0.2, -0.05), at(0.4, -0.05), at(0.4, 0.05), at(0.2, 0.05), at(0.08, 0.12), at(-0.36, 0.12)], 0.022, a, true)
      break
    case 'boot':
      stroke(pen, plot, [at(-0.16, 0.3), at(-0.18, -0.1), at(-0.2, -0.22), at(0.3, -0.22), at(0.33, -0.1), at(0.1, 0.0), at(0.08, 0.3)], 0.022, a, true)
      stroke(pen, plot, [at(-0.2, -0.22), at(-0.2, -0.28), at(0.3, -0.28), at(0.3, -0.22)], 0.022, a)
      // Three eyelets up its front, each a small bump on its edge: no bars one above another.
      for (const h of [0.06, 0.15, 0.24]) ring(pen, plot, x + 0.085 + 0.006 * h, y + h, 0.028, 0.012, a, -Math.PI / 2, Math.PI / 2)
      break
    case 'pot': {
      // A clay pot: a belly, a neck and a rim, with a chip out of the rim.
      const side: Dot[] = []
      for (let t = 0; t <= 1.001; t += 0.1) side.push(at(-0.08 - 0.22 * Math.sin(Math.PI * Math.pow(t, 0.8)), -0.3 + 0.5 * t))
      stroke(pen, plot, [...side, at(-0.14, 0.28), at(0.02, 0.28), at(0.06, 0.22), at(0.14, 0.28), ...side.map(([px0, py0]): Dot => [2 * x - px0, py0]).reverse()], 0.022, a, true)
      break
    }
    case 'chest':
      stroke(pen, plot, [at(-0.3, -0.2), at(0.3, -0.2), at(0.3, 0.06), at(-0.3, 0.06)], 0.022, a, true)
      ring(pen, plot, x, y + 0.06, 0.3, 0.022, a, Math.PI, Math.PI * 2)
      stroke(pen, plot, [at(-0.04, 0.03), at(0.04, 0.03), at(0.04, -0.08), at(-0.04, -0.08)], 0.016, a, true)
      break
    case 'burrow': {
      // A burrow: a chamber with a bed, a shelf with a jar and a lamp on its cord, and the tunnel up to the grass.
      stroke(pen, plot, [at(-0.75, -0.3), at(0.75, -0.3)], 0.022, a)
      ring(pen, plot, x, y - 0.3, 0.75, 0.022, a, Math.PI, Math.PI * 2)
      stroke(pen, plot, [at(-0.6, -0.3), at(-0.6, -0.12), at(-0.05, -0.12), at(-0.05, -0.3)], 0.02, a)
      stroke(pen, plot, [at(-0.6, -0.12), at(-0.6, 0.02)], 0.02, a)
      ring(pen, plot, x - 0.45, y - 0.08, 0.09, 0.016, a, Math.PI, Math.PI * 2)
      // The shelf is let into the burrow's wall.
      stroke(pen, plot, [at(0.2, 0.02), at(0.68, 0.02)], 0.02, a)
      stroke(pen, plot, [at(0.3, 0.02), at(0.3, 0.16), at(0.4, 0.16), at(0.4, 0.02)], 0.014, a)
      stroke(pen, plot, [at(0.08, 0.44), at(0.08, 0.24)], 0.01, a)
      stroke(pen, plot, [at(0.02, 0.24), at(0.14, 0.24), at(0.11, 0.14), at(0.05, 0.14)], 0.014, a, true)
      break
    }
  }
}

/** The finds in the ground, and the burrow's tunnel up through the hatching. Painted after the ground. */
export function paintUnderground(pen: Pen, plot: Plot, at: Site) {
  const deck = at.left[1], random = stream(siteSeed(at) + 23)
  // The beds of the ground, as a section shows them: two long uneven lines through each bank, and pebbles along the lower one.
  for (const [from, to] of [[-MARGIN.side, at.left[0] - 0.25], [at.right[0] + 0.25, COLS + MARGIN.side]] as const) {
    for (const [share, swing] of [[0.38, 0.16], [0.72, 0.22]] as const) {
      const level = deck * (1 - share), phase = random() * 6, bed: Dot[] = []
      for (let x = from; x <= to + 0.001; x += 0.25) bed.push([x, level + swing * Math.sin(x * 0.7 + phase) + 0.08 * Math.sin(x * 2.3 + phase)])
      stroke(pen, plot, bed, 0.024, FAINT.fence)
      // Pebbles: short flat dashes, each a little askew. Not rings.
      if (share > 0.5) for (let x = from + 0.5; x < to - 0.3; x += 0.7 + random() * 1.1) { const py = level + swing * Math.sin(x * 0.7 + phase) - 0.16 - 0.1 * random(), wide = 0.06 + 0.05 * random(); stroke(pen, plot, [[x - wide, py], [x, py + 0.035], [x + wide, py + 0.01]], 0.03, FAINT.fence) }
    }
  }
  // Under each tree, its roots: two uneven threads going down side by side, which never meet.
  for (const one of trees(at)) for (const side of one.kind === 'bush' ? [] : [-1, 1]) {
    const root: Dot[] = []
    for (let d = 0.06; d <= 0.5 + 0.12 * side; d += 0.08) root.push([one.x + side * (0.07 + 0.2 * d + 0.04 * Math.sin(d * 14 + one.x)), deck - d])
    stroke(pen, plot, root, 0.018, FAINT.fence)
  }
  for (const one of finds(at)) {
    if (one.what === 'burrow') {
      // The tunnel: two lines up to just under the grass, and a mound over its mouth.
      const curve = (dx: number, dy: number) => {
        const [x0, y0] = px(plot, one.x + 0.48 + dx, one.y + 0.2 + dy), [x1, y1] = px(plot, one.x + 0.75 + dx, deck - 0.13)
        pen.beginPath(); pen.moveTo(x0, y0); pen.quadraticCurveTo(x1, y0 - plot.cell * 0.2, x1, y1); pen.stroke()
      }
      pen.strokeStyle = INK.sheet
      pen.globalAlpha = 0.92
      pen.lineWidth = plot.cell * 0.3
      pen.lineCap = 'butt'
      curve(0, 0)
      pen.strokeStyle = INK.line
      pen.globalAlpha = FAINT.finds
      pen.lineWidth = Math.max(0.75, plot.cell * 0.02)
      for (const side of [-0.13, 0.13]) curve(side, side * 0.4)
      pen.globalAlpha = 1
      ring(pen, plot, one.x + 0.75, deck, 0.22, 0.022, FAINT.finds, Math.PI, Math.PI * 2)
    }
    find(pen, plot, one.what, one.x, one.y)
  }
}

/** Where things stand along the bottom of the sheet, below the ground: the ledge the crew stand on, and what room is left beside the tray and the tools. */
export function desk(at: Site): { ledge: readonly [number, number]; floor: number; crew: readonly [number, number]; leftRoom: readonly [number, number]; rightRoom: readonly [number, number] } {
  const piles = bays(at), box = tools(at), floor = TRAY.top - TRAY.tall
  const trayLeft = piles.length ? piles[0].x0 : at.left[0] - 1, toolsRight = box[box.length - 1].x1
  // The crew stand side by side just left of the tray, the mole with room for its rule, and never off the sheet.
  const second = Math.max(2.3, trayLeft - 1.7), first = Math.max(0.3, second - 2.0)
  return { ledge: [first - 1.3, second + 0.95], floor, crew: [first, second], leftRoom: [-MARGIN.side + 0.5, first - 1.6], rightRoom: [toolsRight + 0.4, COLS + MARGIN.side - 0.5] }
}

/** The draughtsman's own things along the bottom of the sheet, each drawn in line: the ledge the crew stand on, a set square and a pair of compasses where there is room on the left, and the drawing's empty title block and a mug where there is room on the right. */
export function paintDesk(pen: Pen, plot: Plot, at: Site) {
  const { ledge, floor, leftRoom, rightRoom } = desk(at), a = FAINT.desk
  stroke(pen, plot, [[ledge[0], floor], [ledge[1], floor]], 0.05, 0.9)
  const left = leftRoom[1] - leftRoom[0]
  if (left >= 2.2) {
    // A set square, lying flat, with its cut-out.
    const x = leftRoom[1] - 2.0, y = floor + 0.05
    stroke(pen, plot, [[x, y], [x + 1.7, y], [x, y + 1.25]], 0.022, a, true)
    stroke(pen, plot, [[x + 0.3, y + 0.25], [x + 0.95, y + 0.25], [x + 0.3, y + 0.73]], 0.014, a, true)
  }
  if (left >= 4.6) {
    // A rubber, lying on the ledge: a block with a paper sleeve round its middle. Two closed boxes, and nothing that points.
    const x = leftRoom[1] - 3.7, y = floor + 0.05
    stroke(pen, plot, [[x, y], [x + 1.1, y], [x + 1.1, y + 0.42], [x, y + 0.42]], 0.02, a, true)
    stroke(pen, plot, [[x + 0.3, y - 0.03], [x + 0.85, y - 0.03], [x + 0.85, y + 0.45], [x + 0.3, y + 0.45]], 0.016, a, true)
  }
  const right = rightRoom[1] - rightRoom[0]
  if (right >= 2.9) {
    // The title block every drawing has, ruled and left empty: no line of writing, real or pretend.
    const x1 = rightRoom[1], x0 = x1 - 2.7, y0 = floor + 0.05, y1 = y0 + 1.35
    stroke(pen, plot, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0.022, a, true)
    // Two boxes: one rule across, from side to side. No rule meets it or crosses it.
    stroke(pen, plot, [[x0, y0 + 0.9], [x1, y0 + 0.9]], 0.014, a)
  }
  if (right >= 4.3 || (right >= 1.3 && right < 2.9)) {
    // A mug, seen from the side. Its steam is drawn live.
    const [mx, my] = mugAt(at)!
    stroke(pen, plot, [[mx - 0.3, my + 0.62], [mx - 0.26, my], [mx + 0.26, my], [mx + 0.3, my + 0.62]], 0.022, a, true)
    ring(pen, plot, mx + 0.36, my + 0.33, 0.17, 0.022, a, -1.3, 1.3)
    stroke(pen, plot, [[mx - 0.5, my], [mx + 0.62, my]], 0.014, a * 0.7)
  }
}

/** Where the mug stands, if the sheet has room for one: the middle of its foot. */
export const mugAt = kept((at: Site): readonly [number, number] | null => {
  const { rightRoom, floor } = desk(at), right = rightRoom[1] - rightRoom[0]
  if (right >= 4.3) return [rightRoom[1] - 3.5, floor + 0.05]
  if (right >= 1.3 && right < 2.9) return [rightRoom[0] + 0.55, floor + 0.05]
  return null
})

/** The stretches of the gap where the water is open at its surface, widest first: between a bank's foot, a rock and the other bank. */
export const reaches = kept((at: Site): (readonly [number, number])[] => {
  const out: [number, number][] = []
  let from: number | null = null
  for (let x = at.left[0]; x <= at.right[0] + 0.001; x += 0.25) {
    const wet = x > at.left[0] + 0.2 && x < at.right[0] - 0.2 && groundAt(at, x) < WATER - 0.3
    if (wet && from === null) from = x
    if (!wet && from !== null) { out.push([from, x - 0.25]); from = null }
  }
  return out.sort((a, b) => b[1] - b[0] - (a[1] - a[0]))
})

/** The sky's height on the sheet, for what drifts in it. */
export const SKY = { low: ROWS - 3.4, high: ROWS - 0.9, clouds: ROWS - 2.4 } as const
