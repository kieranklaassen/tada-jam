import { BRANCH_OF, BURNT, STAIN, WOOD, blob, cut, engrave, inlay, oval, stroke, tick, twig, type Box, type G } from './ply'
import type { Season } from './wood'

// The stained pieces of the wood: the crowns of the trees, the bushes, and
// the patches on the ground. Each is one cut piece with one wash of the
// season's stain, and each has four sides to show. When the year turns they
// flip over one after another, from the left of the frame to the right.

export type Seasonal = {
  key: string
  /** Where the piece's own origin stands on the stage. */
  x: number
  y: number
  /** Which way it flips over: about its upright or about its level. */
  flip: 'x' | 'y'
  /** It lies on the strip of blades at the very front, and is stamped after it. */
  front?: boolean
  box: Box
  paint: (g: G, season: Season, grain: boolean) => void
}

const TAU = Math.PI * 2

/** A scalloped outline round a centre: the edge of a crown or a bush. */
function lobes(rx: number, ry: number, count: number, lean = 0): number[] {
  const points: number[] = []
  for (let i = 0; i < count * 2; i++) {
    const angle = (i / (count * 2)) * TAU + lean, k = i % 2 === 0 ? 1 : 0.8
    points.push(Math.cos(angle) * rx * k, Math.sin(angle) * ry * k)
  }
  return points
}

/** What a season puts on a crown besides its stain. The spots are in shares of the crown's size. */
const SPOTS: readonly (readonly [number, number])[] = [[-0.5, -0.2], [0.1, -0.55], [0.55, -0.1], [-0.15, 0.1], [0.3, 0.35], [-0.55, 0.3], [0.05, -0.15]]

function dress(g: G, season: Season, rx: number, ry: number, branch: number): void {
  const stain = STAIN[season]
  if (season === 'spring') for (const [u, v] of SPOTS) inlay(g, u * rx, v * ry, Math.max(5, rx * 0.075), stain.other, 1.4)
  // Summer: the leaves show as short curves, no two the same size or tilt.
  if (season === 'summer') engrave(g, (h) => { SPOTS.forEach(([u, v], index) => tick(u * rx, v * ry, rx * (0.14 + ((index * 5) % 4) * 0.045), ry * (0.07 + ((index * 3) % 5) * 0.022), ((index * 7) % 5) * 0.34 - 0.7)(h)) }, 1.6, 0.6)
  if (season === 'autumn') {
    SPOTS.forEach(([u, v], index) => {
      g.beginPath()
      oval(u * rx, v * ry, Math.max(7, rx * 0.1), Math.max(4, rx * 0.055), index * 0.9)(g)
      g.fillStyle = stain.other
      g.fill()
      g.strokeStyle = BURNT
      g.lineWidth = 1.2
      g.stroke()
    })
  }
  if (season === 'winter') {
    // Bare: the boughs show, engraved, and the snow lies on them.
    engrave(g, twig(-rx * 0.06, ry * 0.85, ry * 1.5, branch === BRANCH_OF.crown ? 0.1 : -0.14, branch), 2.2, 0.75)
    for (const [u, v] of SPOTS.slice(0, 4)) inlay(g, u * rx, v * ry + ry * 0.2, Math.max(3, rx * 0.04), stain.other, 0)
  }
}

function crown(key: string, x: number, y: number, rx: number, ry: number, count: number, seed: number): Seasonal {
  const outline = lobes(rx, ry, count, seed)
  return {
    key, x, y, flip: 'x', box: [-rx - 6, -ry - 6, rx + 14, ry + 18],
    paint: (g, season, grain) => {
      cut(g, blob(outline), WOOD.birch, [-rx, -ry, rx, ry], { grain, gap: 8, seed, stain: STAIN[season].leaf, wash: season === 'winter' ? 0.8 : 0.7, slant: 0.3 })
      dress(g, season, rx, ry, BRANCH_OF.crown)
    },
  }
}

/** The far trees: two crowns on the far rise, one piece of thin ply. */
const far: Seasonal = {
  key: 'far', x: 600, y: 340, flip: 'y', box: [-480, -62, -84, 56],
  paint: (g, season, grain) => {
    for (const [x, y, r] of [[-424, -10, 46], [-134, 0, 42]] as const) {
      cut(g, blob(lobes(r, r * 0.82, 5, x).map((value, index) => value + (index % 2 === 0 ? x : y))), WOOD.board, [x - r, y - r, x + r, y + r], { grain, gap: 4, seed: x, stain: STAIN[season].leaf, wash: 0.45, edge: 1.8 })
    }
  },
}

function patch(key: string, x: number, y: number, seed: number, branch: number): Seasonal {
  return {
    key, x, y, flip: 'y', front: true, box: [-70, -56, 76, 26],
    paint: (g, season, grain) => {
      const stain = STAIN[season]
      if (season === 'summer') for (const [bx, top] of [[-34, -44], [-12, -52], [14, -46], [36, -38]] as const) cut(g, blob([bx - 7, 2, bx, top, bx + 7, 2]), WOOD.birch, [bx - 8, top, bx + 8, 4], { grain, gap: 2, seed: seed + bx, stain: stain.grass, edge: 1.6 })
      if (season === 'spring') engrave(g, (h) => { stroke([-30, 0, -32, -30])(h); stroke([4, 0, 2, -40])(h); stroke([34, 0, 38, -26])(h) }, 2, 0.8)
      cut(g, blob([-62, 12, -44, -8, 0, -14, 44, -8, 62, 12, 0, 18]), WOOD.birch, [-64, -16, 64, 20], { grain, gap: 3, seed, stain: stain.grass, wash: 0.74 })
      if (season === 'spring') for (const [fx, fy] of [[-32, -32], [2, -42], [38, -28]] as const) { inlay(g, fx, fy, 9, stain.other, 1.4); inlay(g, fx, fy, 3, '#f4d24a', 0) }
      if (season === 'summer') for (const [fx, fy] of [[-46, -12], [50, -10]] as const) { inlay(g, fx, fy, 7, '#fbf7ea', 1.2); inlay(g, fx, fy, 2.5, stain.other, 0) }
      if (season === 'autumn') {
        [[-34, -8, 0.4], [-4, -14, -0.5], [28, -10, 0.9], [8, 4, 0.1]].forEach(([lx, ly, turn], index) => {
          g.beginPath()
          oval(lx, ly, 15, 8, turn)(g)
          g.fillStyle = index % 2 ? stain.other : stain.leaf
          g.fill()
          g.strokeStyle = BURNT
          g.lineWidth = 1.4
          g.stroke()
        })
      }
      if (season === 'winter') {
        engrave(g, twig(branch === BRANCH_OF.patchC ? -6 : 8, -8, 40, branch === BRANCH_OF.patchC ? -0.25 : 0.3, branch), 2, 0.8)
        for (const [dx, dy] of [[-36, 2], [20, -2], [40, 6]] as const) inlay(g, dx, dy, 3, stain.other, 0)
      }
    },
  }
}

function bush(key: string, x: number, y: number, rx: number, ry: number, seed: number): Seasonal {
  return {
    key, x, y, flip: 'x', box: [-rx - 6, -ry - 6, rx + 12, ry + 14],
    paint: (g, season, grain) => {
      cut(g, blob(lobes(rx, ry, 6, seed)), WOOD.maple, [-rx, -ry, rx, ry], { grain, gap: 6, seed, stain: STAIN[season].leaf, wash: 0.6 })
      dress(g, season, rx * 0.8, ry * 0.8, BRANCH_OF.bush)
    },
  }
}

/** Every stained piece, in the order it is stamped: far to near. */
export const SEASONAL: readonly Seasonal[] = [
  far,
  bush('bush-left', 160, 448, 64, 40, 2),
  crown('crown-jay', 724, 140, 112, 100, 8, 0.5),
  patch('patch-c', 716, 806, 23, BRANCH_OF.patchC),
  patch('patch-d', 566, 806, 24, BRANCH_OF.patchD),
]

/** When each piece flips as the year turns: a share from 0 to 1 of the wave, by where it stands from left to right. */
export function flipDelay(piece: Pick<Seasonal, 'x'>): number {
  return Math.min(1, Math.max(0, piece.x / 1180))
}
