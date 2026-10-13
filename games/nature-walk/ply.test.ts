import { describe, expect, it } from 'vitest'
import { BREAST, WHEEL_ART, WHEEL_BEND } from './animalArt'
import { BRANCH_VEINS } from './coverArt'
import { FIND_ART, SKATER_LEGS } from './findArt'
import { BRANCHES, BRANCH_OF, FALLS, LIGHTS, PLIES, SHADOW, WOOD, cut, lightFor, poly, setLight, tick, twig, type G } from './ply'
import { tracingContext } from './recorder'
import { DOORWAY_ART, WINDOW_ART } from './roomArt'
import { paintSky } from './scenery'
import { SEASONAL } from './seasonal'

// The look as numbers: a sheet with a thickness, a shadow thrown the one way
// whatever the turn or the mirror, wood with its grain at every tier, and
// engraved marks that are no letter and no sign.

const TAU = Math.PI * 2
const SQUARE = poly([0, 0, 40, 0, 40, 40, 0, 40])
/** The numbers of every call of one name in a trace. */
const calls = (trace: readonly string[], name: string): number[][] => trace.filter((line) => line.startsWith(`${name}(`)).map((line) => line.slice(name.length + 1, -1).split(',').map(Number))
/** How far apart two directions are, in radians. */
const apart = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))

describe('a sheet of ply has a thickness, and its grain at every tier', () => {
  it('a piece that stands off the sheet behind it shows its shadow and then its three plies, each a step nearer along the light', () => {
    const { g, trace } = tracingContext()
    cut(g, SQUARE, WOOD.birch, [0, 0, 40, 40], { gap: 6, grain: true })
    // The first four fills are the shadow and the three plies, each on a copy of the outline moved along the light.
    const fills = trace.filter((line) => line.startsWith('fillStyle=')).slice(0, 4)
    expect(fills).toEqual([`fillStyle=${SHADOW}`, ...PLIES.map((ply) => `fillStyle=${ply}`)])
    const steps = calls(trace, 'translate').slice(0, 4)
    const far = steps.map(([x, y]) => Math.hypot(x, y))
    for (const [x, y] of steps) expect(apart(Math.atan2(y, x), FALLS)).toBeLessThan(0.02)
    // The shadow lies past the thickness; the plies come nearer, the last a third of the thickness out.
    expect(far[0]).toBeGreaterThan(far[1])
    expect(far[1]).toBeGreaterThan(far[2])
    expect(far[2]).toBeGreaterThan(far[3])
    expect(far[1]).toBeGreaterThanOrEqual(2.2)
    expect(far[3]).toBeGreaterThan(0.5)
    // A piece let into the sheet behind it throws nothing and shows no side.
    const flat = tracingContext()
    cut(flat.g, SQUARE, WOOD.birch, [0, 0, 40, 40], { gap: 0 })
    expect(flat.trace.filter((line) => line === `fillStyle=${SHADOW}`)).toEqual([])
    expect(flat.trace.filter((line) => PLIES.some((ply) => line === `fillStyle=${ply}`))).toEqual([])
  })

  it('where a tier leaves the fine grain out, broad bands stand in for it: the wood is never a flat fill, stained or not', () => {
    const lines = (grain: boolean, stain?: string): number => {
      const { g, trace } = tracingContext()
      cut(g, SQUARE, WOOD.birch, [0, 0, 40, 40], { gap: 0, grain, stain })
      // Every grain line is begun by a move far to the left of the piece, under the turn of the grain.
      return calls(trace, 'moveTo').filter(([x]) => x < -20).length
    }
    for (const stain of [undefined, '#46a44e']) {
      const fine = lines(true, stain), broad = lines(false, stain)
      expect(broad, `stand-in, ${stain ?? 'bare'}`).toBeGreaterThanOrEqual(2)
      expect(fine, `fine, ${stain ?? 'bare'}`).toBeGreaterThan(broad * 2)
    }
  })
})

describe('the shadow falls the one way for every piece, whatever its turn or its mirror', () => {
  it('a painter throws its shadow where it is told the light falls, and inside a turned context still the same way on the sheet', () => {
    for (let way = 0; way < LIGHTS; way++) {
      const { g, trace } = tracingContext()
      setLight(way)
      cut(g, SQUARE, WOOD.birch, [0, 0, 40, 40], { gap: 6 })
      setLight(0)
      const [x, y] = calls(trace, 'translate')[0]
      expect(apart(Math.atan2(y, x), FALLS + (way * TAU) / LIGHTS), `way ${way}`).toBeLessThan(0.02)
    }
    // A painter that has turned its context by a quarter and mirrored it: the shadow's step, seen on the sheet, is unchanged.
    const { g, trace } = tracingContext()
    g.rotate(Math.PI / 2)
    g.scale(-1, 1)
    cut(g, SQUARE, WOOD.birch, [0, 0, 40, 40], { gap: 6 })
    const [x, y] = calls(trace, 'translate')[0]
    // Under a quarter turn and then a mirror, a step (x, y) of the painter is (-y, -x) on the sheet.
    expect(apart(Math.atan2(-x, -y), FALLS)).toBeLessThan(0.02)
  })

  it('the painting chosen for a stamp throws its shadow down and to the right on the screen: turned, mirrored, or squeezed as it flips', () => {
    const half = TAU / LIGHTS / 2
    for (const mirror of [1, -1]) for (const squeeze of [1, 0.6]) for (let turn = -3.1; turn < 3.2; turn += 0.17) {
      const cos = Math.cos(turn), sin = Math.sin(turn)
      // As a canvas has a turn and then a scale of (mirror, squeeze).
      const a = cos * mirror, b = sin * mirror, c = -sin * squeeze, d = cos * squeeze
      const way = lightFor(a, b, c, d), local = FALLS + (way * TAU) / LIGHTS
      const lx = Math.cos(local), ly = Math.sin(local)
      const onScreen = Math.atan2(b * lx + d * ly, a * lx + c * ly)
      expect(apart(onScreen, FALLS), `turn ${turn.toFixed(2)}, mirror ${mirror}, squeeze ${squeeze}`).toBeLessThan(squeeze === 1 ? half + 0.01 : half * 2)
    }
    // A mirrored piece is not stamped in the painting of the piece as it stands: that one would throw its shadow to the left.
    expect(lightFor(-1, 0, 0, 1)).not.toBe(lightFor(1, 0, 0, 1))
    expect(lightFor(1, 0, 0, 1)).toBe(0)
  })
})

describe('engraved marks are no letter and no sign', () => {
  it('a bare branch forks like a branch: one side branch low to one side and one higher to the other, of different lengths, never two on one side of the stem, and no two copies the same', () => {
    const seen: string[] = []
    BRANCHES.forEach((branch, which) => {
      const { g, trace } = tracingContext()
      twig(0, 0, 100, 0, which)(g)
      // Drawn as it is given: the stem, then each side branch from the point of the stem it leaves at.
      const starts = calls(trace, 'moveTo')
      expect(starts[0]).toEqual([0, 0])
      const leaves = [starts[1], starts[starts.length > 3 && branch.subA ? 3 : 2]]
      expect(leaves[0][0]).toBeCloseTo(branch.a[0] * 100, 5)
      expect(leaves[1][0]).toBeCloseTo(branch.b[0] * 100, 5)
      // The two leave the stem at different heights, neither at its foot nor at its tip.
      for (const [, h] of [branch.a, branch.b]) { expect(h).toBeGreaterThan(0.2); expect(h).toBeLessThan(0.8) }
      expect(Math.abs(branch.a[1] - branch.b[1]), `branch ${which}`).toBeGreaterThanOrEqual(0.19)
      // They go out to opposite sides, knee and end alike, and both rise: no level bar, and no two arms on one side.
      for (const arm of [branch.armA, branch.armB]) { expect(Math.sign(arm[0])).toBe(Math.sign(arm[2])); expect(arm[1]).toBeGreaterThan(0); expect(arm[3]).toBeGreaterThan(arm[1]) }
      expect(Math.sign(branch.armA[2])).toBe(-Math.sign(branch.armB[2]))
      // One is the longer, so the branch is no mirror of itself.
      const long = [branch.armA, branch.armB].map((arm) => Math.hypot(arm[2], arm[3]))
      expect(Math.max(...long) / Math.min(...long), `branch ${which}`).toBeGreaterThan(1.15)
      // The stem kinks where it forks: it is not an upright.
      expect(Math.abs(branch.a[0] - branch.b[0]) + Math.abs(branch.b[0] - branch.tip)).toBeGreaterThan(0.08)
      seen.push(JSON.stringify(branch))
    })
    expect(BRANCHES.length).toBe(7)
    expect(new Set(seen).size).toBe(BRANCHES.length)
  })

  it('every place that shows a bare branch in winter shows one of its own, and each of them engraves it', () => {
    const which = Object.values(BRANCH_OF)
    expect(new Set(which).size).toBe(which.length)
    expect([...which].sort()).toEqual(BRANCHES.map((_, index) => index))
    // Each painter of a winter side draws the branch it is given: the stem's first step, from its foot, is in its trace.
    const painters: Record<keyof typeof BRANCH_OF, (g: G) => void> = {
      wheel: (g) => WHEEL_ART.paint(g, true),
      crown: (g) => SEASONAL.find((piece) => piece.key === 'crown-jay')!.paint(g, 'winter', true),
      bush: (g) => SEASONAL.find((piece) => piece.key === 'bush-left')!.paint(g, 'winter', true),
      patchC: (g) => SEASONAL.find((piece) => piece.key === 'patch-c')!.paint(g, 'winter', true),
      patchD: (g) => SEASONAL.find((piece) => piece.key === 'patch-d')!.paint(g, 'winter', true),
      window: (g) => WINDOW_ART.paint(g, 'winter', true),
      doorway: (g) => DOORWAY_ART.paint(g, 'winter', true),
    }
    // A stem is one stroke of four points: its foot, its two forks and its tip. Whatever the size, lean or side it is
    // drawn at, where the forks stand between foot and tip is the branch's own, and tells which branch it is.
    const stemOf = (points: readonly number[][]): number[] => {
      const [foot, a, b, tip] = points, wx = tip[0] - foot[0], wy = tip[1] - foot[1], ww = wx * wx + wy * wy
      return [a, b].flatMap((p) => { const x = p[0] - foot[0], y = p[1] - foot[1]; return [(x * wx + y * wy) / ww, Math.abs(y * wx - x * wy) / ww] })
    }
    const own = BRANCHES.map((branch) => stemOf([[0, 0], [...branch.a], [...branch.b], [branch.tip, 1]]))
    for (const place of Object.keys(BRANCH_OF) as (keyof typeof BRANCH_OF)[]) {
      const { g, trace } = tracingContext()
      painters[place](g)
      const drawn = new Set<number>()
      const point = (line: string): number[] => line.slice(7, -1).split(',').map(Number)
      trace.forEach((line, index) => {
        if (!line.startsWith('moveTo(') || !trace.slice(index + 1, index + 4).every((next) => next.startsWith('lineTo(')) || trace[index + 4]?.startsWith('lineTo(')) return
        const stem = stemOf(trace.slice(index, index + 4).map(point))
        own.forEach((one, which) => { if (one.every((value, at) => Math.abs(value - stem[at]) < 0.008)) drawn.add(which) })
      })
      // The one it is given, and none of the others.
      expect([...drawn], place).toEqual([BRANCH_OF[place]])
    }
  })

  it('a tick is one bent stroke, and the feathers of the jay\'s breast are no two the same size or tilt', () => {
    const { g, trace } = tracingContext()
    tick(0, 0, 20, 6, 0.3)(g)
    expect(calls(trace, 'moveTo')).toHaveLength(1)
    expect(calls(trace, 'quadraticCurveTo')).toHaveLength(1)
    const different = (values: readonly number[], by: number): boolean => values.every((value, index) => values.every((other, at) => at === index || Math.abs(value - other) >= by))
    expect(different(BREAST.map((curve) => curve[2]), 2)).toBe(true)
    expect(different(BREAST.map((curve) => curve[4]), 0.1)).toBe(true)
  })

  it('the quarters of the wheel are cut along edges bent deep enough to be seen at rest, and a hub covers where they meet: no cross in a ring', () => {
    const { g, trace } = tracingContext()
    WHEEL_ART.paint(g, true)
    // Each quarter has two edges from the middle to the rim, each a curve whose bend stands well off the straight line.
    const edges = calls(trace, 'quadraticCurveTo').filter(([cx, cy, x, y]) => Math.abs(Math.hypot(cx, cy) - WHEEL_BEND.out) < 0.5 && (Math.abs(Math.hypot(x, y) - 64) < 0.5 || Math.hypot(x, y) < 0.5))
    expect(edges).toHaveLength(8)
    for (const [cx, cy, x, y] of edges) {
      // The rim end of the edge: the curve's own end, or for the edge that comes back to the middle, where the arc left off.
      const rim = Math.hypot(x, y) > 1 ? Math.atan2(y, x) : null
      if (rim !== null) expect(apart(Math.atan2(cy, cx), rim)).toBeGreaterThan(0.8)
    }
    // At its middle the edge stands 15 units and more off the straight line from the pin to the rim, a quarter of its length: a pinwheel, not a cross.
    expect(WHEEL_BEND.deep).toBeGreaterThan(15)
    // No straight line runs from the middle to the rim.
    expect(calls(trace, 'lineTo').filter(([x, y]) => Math.abs(Math.hypot(x, y) - 64) < 0.02)).toEqual([])
    // The hub: a disc of wood over the middle, wider than the pin.
    expect(calls(trace, 'arc').some(([x, y, r]) => x === 0 && y === 0 && r === 17)).toBe(true)
  })

  it('the pond skater is a body with four bent legs, each from its own place and each to its own dimple: no two lines cross', () => {
    const { g, trace } = tracingContext()
    FIND_ART.skater.paint(g)
    expect(SKATER_LEGS).toHaveLength(4)
    const crosses = (a: number[], b: number[], c: number[], d: number[]): boolean => { const side = (p: number[], q: number[], r: number[]): number => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b) }
    const parts = SKATER_LEGS.flatMap(([fx, fy, kx, ky, x, y]) => [[[fx, fy], [kx, ky]], [[kx, ky], [x, y]]])
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) if (Math.floor(i / 2) !== Math.floor(j / 2)) expect(crosses(parts[i][0], parts[i][1], parts[j][0], parts[j][1]), `legs ${i} and ${j}`).toBe(false)
    for (const [fx, fy, kx, ky, x, y] of SKATER_LEGS) {
      // A knee: the leg bends by a fifth of a turn at the least.
      expect(apart(Math.atan2(ky - fy, kx - fx), Math.atan2(y - ky, x - kx))).toBeGreaterThan(0.6)
      // It leaves the body where the body is, not from one middle point, and ends in a dimple.
      expect(Math.abs(fx)).toBeGreaterThanOrEqual(8)
      expect(calls(trace, 'ellipse').some(([ex, ey]) => ex === x && ey === y + 2)).toBe(true)
      // As engraved: the stroke goes by way of the knee, and is not one straight line from body to foot.
      expect(trace.join(';')).toContain(`moveTo(${fx},${fy});lineTo(${kx},${ky});lineTo(${x},${y})`)
    }
    // No two feet mirror each other: the four are not the corners of a cross.
    const feet = SKATER_LEGS.map(([, , , , x, y]) => [Math.abs(x), Math.abs(y)])
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(Math.hypot(feet[i][0] - feet[j][0], feet[i][1] - feet[j][1])).toBeGreaterThan(3)
  })

  it('the ribs of the leaves on the low branch never meet: they make no arrow', () => {
    const ribs = BRANCH_VEINS.slice(0, 3)
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      // Where each rib starts is well away from where the others start, and their heights differ.
      expect(Math.hypot(ribs[i][0] - ribs[j][0], ribs[i][1] - ribs[j][1])).toBeGreaterThan(24)
      expect(Math.abs(ribs[i][1] - ribs[j][1])).toBeGreaterThanOrEqual(8)
    }
    // And the two side ribs are no mirror of each other.
    expect(Math.abs(Math.abs(ribs[1][0]) - Math.abs(ribs[2][0]))).toBeGreaterThan(10)
    const long = ribs.map((rib) => Math.hypot(rib[rib.length - 2] - rib[0], rib[rib.length - 1] - rib[1]))
    expect(Math.abs(long[1] - long[2])).toBeGreaterThan(8)
  })

  it('nothing is engraved in the sky: the birds far off are gone', () => {
    const { g, trace } = tracingContext()
    paintSky(g, [0, 0, 1180, 626], true)
    expect(calls(trace, 'quadraticCurveTo')).toEqual([])
  })
})
