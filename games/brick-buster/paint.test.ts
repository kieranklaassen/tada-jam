import { describe, expect, it } from 'vitest'
import { FIELD, GATES } from './layout'
import { LAMPS, LAMP_R, MAT_LOBES, TUB, paintBoard, setSurfaceMaker, type Surface } from './paint'
import { paintPieces } from './pieces'
import { HAIR, paintToys } from './toys'

// What is painted, read from the calls: shapes that could be taken for a
// written sign. Nothing here needs a browser: the sprites are painted into
// surfaces that write down each path and whether it was filled or stroked.

type Box = [number, number, number, number]
type Seen = {
  /** Closed outlines that were stroked and never filled, and are not over anything that was filled before them. */
  rings: { surface: number; box: Box }[]
  /** The middle of every whole ellipse, by surface. */
  ovals: { surface: number; x: number; y: number; rx: number; ry: number }[]
  fills: number
}

/** A surface that writes down what is painted on it. */
function recorder(seen: Seen, index: number): Surface {
  const kept: Record<string, unknown> = {}
  const none: Box = [1e9, 1e9, -1e9, -1e9]
  let closed = false, filled = false, box: Box = [...none]
  const filledBoxes: Box[] = []
  const see = (x: number, y: number) => { box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] }
  const whole = (from: number, to: number) => Math.abs(to - from) >= Math.PI * 2 - 1e-6
  const inside = (inner: Box, outer: Box) => inner[0] >= outer[0] - 2 && inner[1] >= outer[1] - 2 && inner[2] <= outer[2] + 2 && inner[3] <= outer[3] + 2
  const calls: Record<string, (...args: number[]) => void> = {
    beginPath: () => { closed = false; filled = false; box = [...none] },
    closePath: () => { closed = true },
    ellipse: (x, y, rx, ry, _turn, from, to) => {
      see(x - rx, y - ry)
      see(x + rx, y + ry)
      if (whole(from, to)) {
        closed = true
        seen.ovals.push({ surface: index, x, y, rx, ry })
      }
    },
    arc: (x, y, r, from, to) => {
      see(x - r, y - r)
      see(x + r, y + r)
      if (whole(from, to)) closed = true
    },
    moveTo: see,
    lineTo: see,
    arcTo: (x1, y1, x2, y2) => { see(x1, y1); see(x2, y2) },
    quadraticCurveTo: (_cx, _cy, x, y) => see(x, y),
    bezierCurveTo: (_ax, _ay, _bx, _by, x, y) => see(x, y),
    fill: () => {
      filled = true
      seen.fills += 1
      if (closed) filledBoxes.push([...box])
    },
    fillRect: (x, y, w, h) => {
      seen.fills += 1
      filledBoxes.push([x, y, x + w, y + h])
    },
    stroke: () => {
      if (closed && !filled && !filledBoxes.some((under) => inside(box, under))) seen.rings.push({ surface: index, box: box.map(Math.round) as Box })
    },
  }
  const g = new Proxy(kept, {
    get(_, name: string) {
      if (name in kept) return kept[name]
      if (name.startsWith('create')) return () => ({ addColorStop: () => {} })
      return calls[name] ?? (() => {})
    },
    set(_, name: string, value) {
      kept[name] = value
      return true
    },
  })
  return { width: 0, height: 0, getContext: () => g }
}

function painted(paint: () => unknown): Seen {
  const seen: Seen = { rings: [], ovals: [], fills: 0 }
  let made = 0
  const before = setSurfaceMaker(() => recorder(seen, made++))
  try {
    paint()
  } finally {
    setSurfaceMaker(before)
  }
  return seen
}

describe('what is painted', () => {
  it('holds no lone ring: no closed outline is stroked on bare ground, on the board, a toy or a piece (the tub\'s handles are solid lugs)', () => {
    for (const [name, paint] of [['the board', () => paintBoard(1)], ['the toys', () => paintToys(1)], ['the pieces', () => paintPieces(1)]] as const) {
      expect(painted(paint).rings, name).toEqual([])
    }
  })

  it('a post on the rails is one disc: no ring is painted inside it', () => {
    const { ovals } = painted(() => paintBoard(1))
    const left = FIELD.left - 6, right = FIELD.right + 6, top = FIELD.roof - 6
    const posts: [number, number][] = [[left, top], [right, top], [left, FIELD.floor + 4], [right, FIELD.floor + 4]]
    for (const gate of [GATES.dragon, GATES.walrus, GATES.elephant]) posts.push([gate.side < 0 ? left : right, gate.y0], [gate.side < 0 ? left : right, gate.y1])
    expect(posts.length).toBe(10)
    for (const [x, y] of posts) expect(ovals.filter((oval) => Math.hypot(oval.x - x, oval.y - y) < 0.5).length, `the post at ${x}, ${y}`).toBe(1)
  })

  it('an apron lamp is one dome: no ring is painted round it or inside it', () => {
    const { ovals } = painted(() => paintBoard(1))
    for (const [x, y] of LAMPS) {
      // One whole round shape on the lamp's middle, and nothing else round it but its small streak of gloss.
      const on = ovals.filter((oval) => Math.hypot(oval.x - x, oval.y - y) < 0.5)
      expect(on.length, `the lamp at ${x}`).toBe(1)
      expect(on[0].rx).toBe(LAMP_R)
      const near = ovals.filter((oval) => Math.hypot(oval.x - x, oval.y - y) < LAMP_R + 6 && !on.includes(oval))
      for (const oval of near) expect(Math.max(oval.rx, oval.ry), `the lamp at ${x}`).toBeLessThan(LAMP_R * 0.5)
    }
  })

  it('the tub\'s lugs are plain: no dot is painted on either', () => {
    const { ovals } = painted(() => paintToys(1))
    for (const side of [-1, 1]) {
      const lug = { x: side * (TUB.rx - 3) - 8, y: 32, w: 16, h: 34 }
      const dots = ovals.filter((oval) => Math.max(oval.rx, oval.ry) <= 5 && oval.x >= lug.x - 3 && oval.x <= lug.x + lug.w + 3 && oval.y >= lug.y - 3 && oval.y <= lug.y + lug.h + 3)
      expect(dots, `the lug at ${side}`).toEqual([])
    }
  })

  it('the elephant\'s hair is one solid lock swept to a point: a filled shape, wide at the root, that does not curl back on itself', () => {
    expect(HAIR.length).toBeGreaterThanOrEqual(6)
    // Its area, as a closed shape: a lock, and no line.
    let area = 0
    HAIR.forEach(([x, y], i) => {
      const [nx, ny] = HAIR[(i + 1) % HAIR.length]
      area += x * ny - nx * y
    })
    expect(Math.abs(area) / 2).toBeGreaterThan(100)
    // Wide where it grows.
    const [first, last] = [HAIR[0], HAIR[HAIR.length - 1]]
    expect(Math.hypot(first[0] - last[0], first[1] - last[1])).toBeGreaterThanOrEqual(10)
    // Up one edge to the tip and back down the other: along each edge it goes one way only, so there is no hook or curl in it.
    const tip = HAIR.reduce((best, point, index) => (point[0] > HAIR[best][0] ? index : best), 0)
    for (let i = 1; i <= tip; i++) expect(HAIR[i][0]).toBeGreaterThan(HAIR[i - 1][0])
    for (let i = tip + 1; i < HAIR.length; i++) expect(HAIR[i][0]).toBeLessThan(HAIR[i - 1][0])
    for (let i = 1; i <= tip - 1; i++) expect(HAIR[i][1]).toBeLessThan(HAIR[i - 1][1])
  })

  it('a gate\'s mat is a splash of three lobes of unequal reach, and no half disc', () => {
    const bulges = MAT_LOBES.filter((_, index) => index % 2 === 0).map(([, reach]) => reach)
    const dips = MAT_LOBES.filter((_, index) => index % 2 === 1).map(([, reach]) => reach)
    expect(bulges.length).toBe(3)
    for (let i = 0; i < bulges.length; i++) for (let j = i + 1; j < bulges.length; j++) expect(Math.abs(bulges[i] - bulges[j])).toBeGreaterThanOrEqual(4)
    // Each dip comes well back in between the bulges beside it.
    dips.forEach((dip, index) => expect(Math.min(bulges[index], bulges[index + 1]) - dip).toBeGreaterThanOrEqual(15))
    for (let i = 1; i < MAT_LOBES.length; i++) expect(MAT_LOBES[i][0]).toBeGreaterThan(MAT_LOBES[i - 1][0])
  })

  it('past the stage the board paints the table\'s own surroundings: sky and clouds above, sand below', () => {
    const plain = painted(() => paintBoard(1)).fills
    const tall = painted(() => paintBoard(1, 0, 439)).fills
    const wide = painted(() => paintBoard(1, 120, 0)).fills
    // The bands are not one flat colour: clouds, dunes and grains are painted into them.
    expect(tall - plain).toBeGreaterThan(40)
    expect(wide - plain).toBeGreaterThanOrEqual(4)
  })
})
