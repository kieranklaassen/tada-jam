// Felt Meadow's intersection audit: the guidance ladder's first demonstration,
// three seeds planted from the pouch at a quick child's pace, the bee called
// to two flowers until it mixes and drops a seed, a flower picked and carried
// over the meadow, seeds laid on the grass and bounced off a full molehill,
// every character poked through its variants, and the full meadow left to
// live (the bee's own visits, the mouse's outings, the snail's turn).

import type { Driver, Frac, GameAudit } from '../types.ts'

// World spots from games/felt-meadow/layout.ts (units of about a centimetre),
// projected through the game's own camera.
const PLOTS = [
  { x: -34, z: 1 },
  { x: 0, z: -15 },
  { x: 34, z: 1 },
] as const
const POUCH = { x: -62, z: 19 }
// POUCH_SLOTS: each seed's seat in the pouch's mouth with the pouch at rest, `y` over the pouch's base.
const POUCH_SLOTS = [
  { x: -64.5, y: 13.5, z: 22.6 },
  { x: -62.9, y: 14.9, z: 17 },
  { x: -58.7, y: 13.7, z: 21.1 },
] as const
const BURROW = { x: 66, z: -6 }
const STEM_HEIGHT = 15.5

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Mirrors groundY in games/felt-meadow/layout.ts.
function groundY(x: number, z: number): number {
  const rise = 13 * smoothstep(38, -52, z)
  const beyond = z < -52 ? (-52 - z) * (-52 - z) * 0.018 : 0
  const swell = 3.2 * Math.exp(-((x + 8) * (x + 8)) / 2400 - ((z + 30) * (z + 30)) / 700)
  const ripple = 0.7 * Math.sin(x * 0.061 + 1.3) * Math.sin(z * 0.083 + 0.4)
  return rise - beyond + swell + ripple
}

const plotTop = (plot: number) => groundY(PLOTS[plot].x, PLOTS[plot].z) + 4.2 * 0.86

async function at(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: { projectFrac(p: number[]): number[] } }).__jamAudit.projectFrac(q), [x, y, z])
  return [p[0], p[1]]
}
const slot = (d: Driver, i: number) => at(d, POUCH_SLOTS[i].x, groundY(POUCH.x, POUCH.z) + POUCH_SLOTS[i].y, POUCH_SLOTS[i].z)
const molehill = (d: Driver, i: number) => at(d, PLOTS[i].x, plotTop(i), PLOTS[i].z)
const flowerHead = (d: Driver, i: number) => at(d, PLOTS[i].x, plotTop(i) + STEM_HEIGHT - 1, PLOTS[i].z)
const grass = (d: Driver, x: number, z: number) => at(d, x, groundY(x, z) + 2.8, z)

async function tapNamed(d: Driver, pattern: string, fallback: Frac): Promise<void> {
  await d.tap((await d.find(pattern)) ?? fallback)
}

export default {
  enforce: true,
  moments: [
    // The glow rises at 3 s and the felt hand carries a red seed from the pouch to the left molehill at 5–8 s.
    { name: 'idle', run: (d) => d.wait(8600) },
    {
      name: 'plant-and-mix',
      run: async (d) => {
        await tapNamed(d, '^pouch\\b', [0.2, 0.6])
        await d.wait(400)
        await d.drag(await slot(d, 0), await molehill(d, 0), 500)
        await d.wait(150)
        await d.drag(await slot(d, 1), await molehill(d, 1), 600)
        await d.wait(150)
        await d.drag(await slot(d, 2), await molehill(d, 2), 700)
        await d.wait(3200)
        await d.tap(await flowerHead(d, 0))
        await d.wait(4200)
        await d.tap(await flowerHead(d, 1))
        await d.wait(7800)
      },
    },
    {
      name: 'pick-carry',
      run: async (d) => {
        // Pick the blue flower and carry it across the meadow, over the yellow one, to the grass in front.
        await d.press(await flowerHead(d, 2))
        await d.move(await flowerHead(d, 1), 700)
        await d.move(await grass(d, -8, 20), 500)
        await d.release()
        await d.wait(500)
        // A pouch seed let go on a full molehill bounces off beside it.
        await d.drag(await slot(d, 0), await molehill(d, 0), 500)
        await d.wait(700)
        // The bee's orange seed (or any loose one) goes into the bare right molehill.
        await d.drag(await grass(d, -8, 20), await molehill(d, 2), 600)
        await d.wait(3000)
      },
    },
    {
      // Every character poked through its variants, then the full meadow left alone: the bee's own visits, the
      // mouse's outings, the snail's glide and turn.
      name: 'pokes-and-life',
      run: async (d) => {
        for (let i = 0; i < 3; i++) {
          await tapNamed(d, '^bee>bee-body\\b', [0.5, 0.35])
          await d.wait(1500)
        }
        for (let i = 0; i < 3; i++) {
          await tapNamed(d, '^snail>snail-body\\b', [0.72, 0.8])
          await d.wait(i === 0 ? 3600 : 1800)
        }
        await d.tap(await at(d, BURROW.x, groundY(BURROW.x, BURROW.z) + 0.3, BURROW.z))
        await d.wait(1400)
        await tapNamed(d, '^mouse>mouse-body\\b', await grass(d, 64, -4))
        await d.wait(2200)
        await d.tap(await at(d, BURROW.x, groundY(BURROW.x, BURROW.z) + 0.3, BURROW.z))
        await d.wait(1600)
        await tapNamed(d, '^mouse>mouse-body\\b', await grass(d, 64, -4))
        await d.wait(1500)
        await d.wait(11000)
      },
    },
  ],
  // The guidance ring and hand and the contact shadows draw with no depth test, so the audit skips them itself.
  ignore: [
    // Felt dust puffs: particles.
    '^puff\\b',
    // Inverted-hull fuzz shells: pushed out in the vertex shader, so their CPU geometry is the base mesh's own; the
    // base meshes are audited and the shells are reviewed in the contact sheets.
    '-fuzz\\b',
  ],
  allow: [
    // Set into the ground on purpose, so nothing floats on the slope.
    { a: '^hill\\b', b: '^tuft\\b', kind: 'penetration', upTo: 0.4, reason: 'grass tussocks are set into the felt so no gap shows under them on the slope' },
    { a: '^hill\\b', b: '^molehill\\b', kind: 'penetration', upTo: 0.4, reason: 'each molehill is a mound of soil planted in the felt' },
    { a: '^hill\\b', b: '^pouch\\b', kind: 'penetration', upTo: 2.2, reason: 'the pouch stands with its base sunk in the grass; that part is under the felt and never seen' },
    { a: '^hill\\b', b: '^burrow\\b', kind: 'penetration', upTo: 1.7, reason: 'the burrow is a hole: its shaft runs down through the cut in the hill and its soil ring rests on the grass round the cut' },
    {
      a: '^backdrop\\b',
      b: '^hill\\b',
      kind: 'penetration',
      upTo: 0.3,
      reason: 'the hill slab tucks its sides 2 units under the paper floor so their foot is never coplanar with it (a z-fight); only the tuck crosses',
    },
    { a: '^molehill\\b', b: '^seed\\b', kind: 'penetration', upTo: 0.6, reason: 'planting: a seed sinks into its molehill as it goes in' },
    {
      a: '^hill\\b',
      b: '^seed\\b',
      kind: 'penetration',
      upTo: 0.25,
      reason: 'planting: in its last moment a sinking seed passes the foot of its molehill into the felt under it, inside the mound',
    },
    // Picking a flower folds it up round the seed it gives; only the picked flower's parts ever hold a seed.
    { a: '^seed\\b', b: '^(stem|centre|petal|leaf)\\b', upTo: 1.6, reason: 'a picked flower folds its stem, leaves and petals up round its seed as it shrinks into it (the pluck)' },
    // One flower's parts, moving with its growth, bloom, reach and pluck.
    { a: '^centre\\b', b: '^stem\\b', kind: 'pose', upTo: 2.3, reason: 'the stem runs up into the flower head; while the head is small (budding, opening, folding when picked) it sits deeper in it' },
    { a: '^molehill\\b', b: '^stem\\b', kind: 'pose', upTo: 0.8, reason: 'the stem is planted in its molehill and grows up out of it' },
    { a: '^leaf\\b', b: '^stem\\b', kind: 'pose', upTo: 0.55, reason: 'leaves grow from the stem, their bases in it, and fold against it when the flower is picked' },
    { a: '^centre\\b', b: '^leaf\\b', kind: 'pose', upTo: 1.05, reason: 'the leaves fold up to the head when the flower is picked' },
    { a: '^centre\\b', b: '^petal\\b', kind: 'pose', upTo: 0.45, reason: 'petals are set into the centre and close round it as they open and fold' },
    { a: '^petal\\b', b: '^petal\\b', kind: 'pose', upTo: 0.35, reason: 'petals overlap each other as they open and fold' },
    // The critters' own parts.
    { a: 'bee-body\\b', b: 'bee-pollen\\b', kind: 'pose', upTo: 0.5, reason: 'the bee holds her pollen ball against her belly, and it grows there as she gathers' },
    { a: 'bee-pollen\\b', b: 'bee-pollen\\b', kind: 'pose', upTo: 0.42, reason: 'two pollen puffs merge into the one ball the bee carries' },
    { a: 'bee-body\\b', b: 'bee-face\\b', kind: 'pose', upTo: 0.09, reason: 'the face sits on the head, pressed to the body; turning the head presses it a hair deeper' },
    { a: 'snail-body\\b', b: 'snail-eye\\b', kind: 'pose', upTo: 0.33, reason: 'the eye stalks grow out of the head and pull back into it when the snail is poked' },
    { a: 'snail-body\\b', b: 'snail-shell\\b', kind: 'pose', upTo: 0.13, reason: 'the shell sits on the back of the snail and rocks a little deeper as it hunches' },
    { a: 'mouse-body\\b', b: 'mouse-head\\b', kind: 'pose', upTo: 0.11, reason: 'the head joins the body at the neck and tucks in as the mouse dives and climbs out' },
    {
      a: 'mouse-body\\b',
      b: 'mouse-tail\\b',
      kind: 'pose',
      upTo: 0.75,
      reason: 'the tail grows from a root sunk in the rump, so when it flicks or the mouse chases it the tail swings from inside the body and no gap opens at the join',
    },
  ],
} satisfies GameAudit
