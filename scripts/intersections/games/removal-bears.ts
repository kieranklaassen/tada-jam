import type { Driver, Frac, GameAudit } from '../types.ts'

// The Removal Bears: two biscuit bears with a load between them in front of a
// sugar-cube house. The moments start from saved houses: every load tossed
// round, its bears changing ends, heaved wrong to the left, the right and both
// sides, heaved in by each opening, a load dragged along, loads delivered from
// the cart, the ending, the open house and the next one rolling in.

const SLOT = 'tada-jam:slot:removal-bears'
type Kind = 'bath' | 'sofa' | 'granny' | 'lamp' | 'piano' | 'giraffe'
type Load = { kind: Kind; way: { turn: number; back: boolean }; at: 'hands' | 'cart' | 'in'; slot: number }
const load = (kind: Kind, turn: number, at: Load['at'], back = false, slot = 0): Load => ({ kind, way: { turn, back }, at, slot })
const RECT = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]
const ONE = [{ x: 0, cells: RECT }]
const TWO = [{ x: -3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] }, { x: 3, cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]] }]
const THREE = [{ x: -4, cells: RECT }, { x: 0, cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] }, { x: 4, cells: [[0, 0], [1, 0], [2, 0], [0, 1]] }]

async function open(d: Driver, loads: Load[] | null, openings: object[] = ONE, position = 'wide-opening'): Promise<void> {
  await d.reload()
  await d.reload({ [SLOT]: loads ? { v: 1, position, finished: false, seed: 77, openings, loads, next: null, x: 0, wideLeft: true, bumps: 0, shown: true, shownEnds: true } : null })
  await d.wait(300)
}

// A point as the game draws it, at 1180 by 820.
const p = (u: number, v: number): Frac => [0.5 + u / 15.18, (8.8 - v) / 10.55]
const LOAD = p(0, 0.6), CART = p(6, 0.6), opening = (x: number): Frac => p(x, 4.5), BEAR = p(-2.9, 1)

/** A load tossed all the way round, its ends changed, and round again. */
const round = (kind: Kind) => async (d: Driver): Promise<void> => {
  const rest = (['bath', 'sofa', 'lamp'] as Kind[]).filter((k) => k !== kind).slice(0, 2)
  await open(d, [load(kind, 0, 'hands'), load(rest[0], 0, 'cart'), load(rest[1], 0, 'cart')])
  for (let i = 0; i < 4; i++) { await d.tap(LOAD); await d.wait(900) }
  await d.tap((await d.find('^bear-0-head')) ?? BEAR)
  await d.wait(1600)
  await d.tap(LOAD); await d.wait(300); await d.tap(LOAD); await d.wait(300); await d.tap(LOAD)
  await d.wait(1800)
}

/** The load is heaved at the opening as it is, whatever comes of it. */
const heave = (l: Load, openings: object[], xs: number[]) => async (d: Driver): Promise<void> => {
  const rest = (['bath', 'sofa', 'giraffe'] as Kind[]).filter((k) => k !== l.kind).slice(0, 2)
  for (const x of xs) {
    await open(d, [l, load(rest[0], 1, 'cart'), load(rest[1], 2, 'cart')], openings, openings.length === 3 ? 'full-house' : 'which-way')
    await d.tap(opening(x))
    await d.wait(4600)
  }
}

const audit: GameAudit = {
  enforce: true,
  query: 'tier=0&seed=11',
  childAge: 2,
  sampleMs: 330,
  ignore: [
    // Soft contact shadows and the idle ladder's glow: flat decals with depth writing off.
    'shadow-blobs', 'glow-blobs',
    // A screen-facing sprite drawn without a depth test.
    'ghost-hand',
    // Sugar, milk and crumbs in the air for a moment.
    '^crumbs',
    // The tiled kitchen is a picture behind everything.
    '^kitchen',
  ],
  allow: [
    // One bear is a pile of separate biscuits with arms, paws, scarf and head set on it: its own parts press into each other as it bends and squashes.
    { a: '^bear-0', b: '^bear-0', kind: 'pose', upTo: 0.8, reason: 'a bear is one soft doll: its own arms, paws, scarf and filling press together as it squashes' },
    { a: '^bear-1', b: '^bear-1', kind: 'pose', upTo: 0.8, reason: 'a bear is one soft doll: its own arms, paws, scarf and filling press together as it squashes' },
    { a: '^topping', b: '^wall', upTo: 0.3, reason: 'icing is piped on to the cubes, which give a little under it' },
    // Passengers are set into the front of their load and move there.
    { a: '^load-', b: '^load-', kind: 'pose', upTo: 0.9, reason: 'a passenger is set into its load and moves in its place' },
  ],
  moments: [
    { name: 'first-showing', run: async (d) => { await open(d, null); await d.wait(17000) } },
    { name: 'first-showing-touched', run: async (d) => { await open(d, null); await d.wait(3000); await d.tap(p(-7, 7)); await d.wait(1500); await d.tap(CART); await d.wait(2500) } },
    ...(['bath', 'sofa', 'granny', 'lamp', 'piano', 'giraffe'] as Kind[]).map((kind) => ({ name: `round-${kind}`, run: round(kind) })),
    { name: 'wrong-left-and-right', run: async (d) => { for (const [k, t] of [['granny', 0], ['granny', 2], ['giraffe', 0], ['giraffe', 3], ['piano', 1], ['lamp', 1]] as [Kind, number][]) await heave(load(k, t, 'hands'), ONE, [0])(d) } },
    { name: 'wrong-both', run: async (d) => { for (const [k, t] of [['bath', 1], ['sofa', 1], ['sofa', 3]] as [Kind, number][]) await heave(load(k, t, 'hands'), ONE, [0])(d) } },
    { name: 'wrong-at-the-ends', run: heave(load('sofa', 0, 'hands'), THREE, [4]) },
    { name: 'wrong-at-the-left', run: heave(load('giraffe', 0, 'hands'), THREE, [-4]) },
    { name: 'in-everywhere', run: async (d) => { await heave(load('sofa', 2, 'hands'), THREE, [-4])(d); await heave(load('giraffe', 0, 'hands'), THREE, [0])(d); await heave(load('piano', 0, 'hands'), THREE, [4])(d); await heave(load('lamp', 0, 'hands'), TWO, [-3])(d); await heave(load('granny', 0, 'hands'), TWO, [2.5])(d) } },
    {
      name: 'a-drag-and-a-drop',
      run: async (d) => {
        await open(d, [load('bath', 0, 'hands'), load('sofa', 0, 'cart'), load('lamp', 0, 'cart')], THREE, 'full-house')
        await d.drag(LOAD, p(-4, 1), 900)
        await d.wait(900)
        await d.drag(p(-4, -0.2), p(3.5, 1.8), 1200)
        await d.wait(1500)
      },
    },
    {
      name: 'a-house-to-its-end-and-the-next',
      run: async (d) => {
        await open(d, [load('granny', 1, 'in', false, 0), load('bath', 1, 'in', false, 1), load('sofa', 2, 'cart', false, 2)])
        await d.tap(CART)
        await d.wait(1900)
        await d.tap(opening(0))
        await d.wait(12500)
        await d.tap(CART)
        await d.wait(4500)
      },
    },
    {
      name: 'an-open-house-touched',
      run: async (d) => {
        await open(d, [load('lamp', 2, 'in', true, 0), load('giraffe', 0, 'in', false, 1), load('piano', 1, 'in', true, 2)])
        await d.wait(600)
        await d.tap(p(-4.4, 5.6)); await d.wait(900)
        await d.tap(p(0, 5.6)); await d.wait(900)
        await d.tap(BEAR); await d.wait(900)
      },
    },
  ],
}

export default audit
