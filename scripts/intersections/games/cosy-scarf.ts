// Intersection audit script for Cosy Scarf (see scripts/intersections/types.ts).
// A five-year-old's session: the bunny hops in and the guidance ladder plays,
// then quick overlapping taps on the yarn balls, carries across the needles,
// a paint, a ball given to the waiting animal, and a scarf for every animal in
// turn (flight, wrap, dance, the walk home, the next one walking in), with
// pets, the basket, the butterfly, the snow and an unravel woven in between.

import type { Driver, Frac, GameAudit } from '../types.ts'

type Audit = {
  main(): { scene: { getObjectByName(name: string): unknown } } | null
  projectFrac(point: number[]): number[] | null
}
type Point = [number, number, number]

/** layout.ts: SCARF, CELL_H, BASKET, LOOM_SPOT (the audit runs as a five-year-old: 4 balls, 8 rows offered). */
const SCARF = { x: 1, top: 54, z: -1.6 }
const CELL_H = 2.8
const BASKET: Point = [34, 5, 9]
const LOOM_SPOT = [-32, 7] as const

async function spot(d: Driver, p: Point): Promise<Frac> {
  const f = await d.page.evaluate((q) => (window as unknown as { __jamAudit: Audit }).__jamAudit.projectFrac(q), p)
  return f ? [f[0], f[1]] : [0.5, 0.5]
}

/** Where yarn ball `index` is drawn now (an instance of the `yarn-balls` mesh). */
async function ball(d: Driver, index: number): Promise<Frac> {
  const f = await d.page.evaluate((i) => {
    type M4 = { elements: number[]; premultiply(m: M4): M4; clone(): M4 }
    const audit = (window as unknown as { __jamAudit: Audit }).__jamAudit
    const mesh = audit.main()?.scene.getObjectByName('yarn-balls') as { matrixWorld: M4; getMatrixAt(i: number, m: M4): void } | undefined
    if (!mesh) return null
    const m = mesh.matrixWorld.clone()
    mesh.getMatrixAt(i, m)
    const e = m.premultiply(mesh.matrixWorld).elements
    return audit.projectFrac([e[12], e[13], e[14]])
  }, index)
  return f ? [f[0], f[1]] : [0.5, 0.5]
}

async function animal(d: Driver, key: string): Promise<Frac> {
  return (await d.find(`^${key}>body$`)) ?? [0.3, 0.6]
}

/** Play on until `key` stands at the loom (layout.ts LOOM_SPOT) or `limit` ms have passed. */
async function atLoom(d: Driver, key: string, limit: number): Promise<void> {
  for (let t = 0; t < limit; t += 250) {
    const there = await d.page.evaluate(
      ([k, x, z]) => {
        type Root = { visible: boolean; position: { x: number; z: number } }
        const root = (window as unknown as { __jamAudit: Audit }).__jamAudit.main()?.scene.getObjectByName(k) as Root | undefined
        return !!root && root.visible && Math.hypot(root.position.x - x, root.position.z - z) < 1
      },
      [key, LOOM_SPOT[0], LOOM_SPOT[1]] as const,
    )
    if (there) return
    await d.wait(250)
  }
}

const needles = (rows: number): Point => [SCARF.x, SCARF.top - rows * CELL_H - 0.4, SCARF.z]
const cell = (row: number, column: number): Point => [SCARF.x - 10.5 + (column + 0.5) * 4.2, SCARF.top - (row + 0.5) * CELL_H, SCARF.z]

/** Tap balls in turn, quicker than a hop lands, so neighbours are in the air together. */
async function knit(d: Driver, rows: number, gap = 300): Promise<void> {
  for (let i = 0; i < rows; i++) {
    await d.tap(await ball(d, (i * 3) % 4))
    await d.wait(gap)
  }
}

export default {
  enforce: true,
  childAge: 5,
  allow: [
    {
      a: '^sky\\b',
      b: '^snow\\b',
      kind: 'penetration',
      upTo: 0.22,
      reason: 'Modelling, never moves: the knitted sky wall stands down into the snow hill far behind the land, where the hill hides the join (measured 19%).',
    },
    {
      a: '^bunny>body',
      b: '^bunny>feet',
      kind: 'pose',
      upTo: 0.1,
      reason: 'The bunny squashes as it hops and plays, pressing its knitted body a little onto its own feet (measured 6.6% at the peak of a squash): knit on knit, part of the squash.',
    },
  ],
  ignore: [
    // Drawn entirely by their vertex shaders: the CPU geometry is a parameter grid (a flat patch
    // of cells, a unit tube) at the world origin, not what is on screen. Reviewed in the contact sheets.
    '^scarf\\b',
    'strand',
    // Soft transparent overlays that never write depth: camera-facing breath, snow and footfall
    // puffs, the halo quads laid behind the balls, and the contact-shadow decals on the ground.
    '^puffs\\b',
    '^glow-rings\\b',
    '^blob-shadows\\b',
  ],
  // Four moments: the contact sheet holds 16 close-ups plus six tiles a moment (tool note felt-meadow #1).
  moments: [
    {
      name: 'arrive-play-bunny',
      run: async (d) => {
        // The bunny hops in, shivers at the loom; glow rings at 3 s idle, the ghost hand at 5 s.
        await d.wait(7000)
        await knit(d, 5, 260)
        await d.wait(600)
        // Across the basket, over the needles and the scarf, round the loom post and onto the loom.
        await d.press(await ball(d, 2))
        await d.move(await spot(d, [20, 30, 4]), 350)
        await d.move(await spot(d, needles(5)), 350)
        await d.move(await spot(d, [-16, 44, 4]), 400)
        await d.move(await spot(d, cell(2, 2)), 350)
        await d.release()
        await d.wait(500)
        // A paint: rest on one stitch past the dwell, then let go there.
        await d.press(await ball(d, 3))
        await d.move(await spot(d, cell(1, 1)), 450)
        await d.wait(700)
        await d.move(await spot(d, cell(3, 3)), 300)
        await d.wait(600)
        await d.release()
        await d.wait(700)
        // Yarn let go over the waiting bunny flies into the loom and is knitted there.
        await d.drag(await ball(d, 1), await animal(d, 'bunny'), 500)
        await d.wait(700)
        await knit(d, 2, 280)
        await d.wait(1600)
        await d.tap(await animal(d, 'bunny'))
        await d.wait(500)
        await d.tap(await spot(d, cell(4, 2)))
        // Flight, wrap, three binkies, the walk home and the penguin waddling in.
        await d.wait(6500)
      },
    },
    {
      name: 'pets-unravel-penguin',
      run: async (d) => {
        // Pets, the basket, the butterfly and the snow, all in a quick row.
        await d.tap(await animal(d, 'bunny'))
        await d.wait(250)
        await d.tap(await animal(d, 'penguin'))
        await d.wait(300)
        await d.tap(await spot(d, BASKET))
        await d.wait(350)
        await d.tap(await spot(d, [10.5, 58.7, -1.8]))
        await d.wait(300)
        await d.tap(await spot(d, [-12, 0.2, 36]))
        await d.tap(await spot(d, [-60, 12, -70]))
        await d.wait(900)
        await knit(d, 4, 260)
        await d.wait(1200)
        // Pull the needles up two rows: the rows unknit and their balls hop.
        const from = await spot(d, needles(4))
        await d.press(from)
        await d.move([from[0], from[1] - 0.075], 500)
        await d.wait(400)
        await d.release()
        await knit(d, 7, 250)
        await d.wait(2000)
        // Carry the finished scarf toward the penguin: let go, it is given.
        await d.drag(await spot(d, cell(4, 2)), await animal(d, 'penguin'), 500)
        await d.wait(6000)
      },
    },
    {
      name: 'fox-gift',
      run: async (d) => {
        // Knit on while the penguin walks home and the fox walks in, then give it the scarf at the loom.
        await knit(d, 8, 250)
        await atLoom(d, 'fox', 15000)
        await d.wait(1000)
        await d.tap(await animal(d, 'fox'))
        await d.wait(300)
        await d.tap(await spot(d, cell(4, 2)))
        await d.wait(6500)
      },
    },
    {
      name: 'bear-gift',
      run: async (d) => {
        await knit(d, 8, 250)
        await atLoom(d, 'bear', 15000)
        await d.wait(1000)
        await d.tap(await animal(d, 'bear'))
        await d.wait(300)
        await d.tap(await spot(d, cell(4, 2)))
        await d.wait(7500)
      },
    },
  ],
} satisfies GameAudit
