// Balloon Pop Parade's intersection audit: a new game opening with a pair
// passing by and the first troop walking in, the idle ladder, then every way a
// bunch can go (taken, refused, one too many) and every touch (a pop, a poke,
// the waiting troop, a cloud, the hill) at a quick child's pace, an ending cut
// short by a touch and one left to play out, a step-in, and saved games with
// bunches: three friends served at once, a whole troop carried off, a bunch
// bigger than the troop, and a first showing of bunches inside a step-in.

import { friendX, GROUND, HELD_HEIGHT, skySlots, viewFor, waitingSpot } from '../../../games/balloon-pop-parade/layout.ts'
import type { Driver, Frac, GameAudit } from '../types.ts'

const SLOT = 'tada-jam:slot:balloon-pop-parade'
const VIEW = viewFor(1180, 820)

async function at(d: Driver, x: number, y: number, z = 0): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: { projectFrac(p: number[]): number[] | null } }).__jamAudit.projectFrac(q), [x, y, z])
  return p ? [p[0], p[1]] : [0.5, 0.5]
}

/** The place of bunch `slot` in a sky of `slots`. */
const sky = (d: Driver, slot: number, slots: number) => { const p = skySlots(slots, VIEW)[slot]; return at(d, p.x, p.y) }
/** Friend `i` of a troop of `size`, at its middle. */
const friend = (d: Driver, i: number, size: number) => at(d, friendX(i, size), GROUND + 1)
/** The balloon friend `i` holds. */
const held = (d: Driver, i: number, size: number) => at(d, friendX(i, size) + 0.7, GROUND + HELD_HEIGHT)
const waiting = (d: Driver) => { const spot = waitingSpot(0, VIEW); return at(d, spot.x, GROUND + 0.9, spot.z) }

type Kind = 'duck' | 'frog' | 'hippo' | 'crab'
const one = (colour: Kind) => ({ colour, count: 1 })

/** A saved game with every first showing seen, unless `shown` says otherwise. */
function saved(position: string, kind: Kind, heldBy: boolean[], bunches: { colour: Kind; count: number }[], next: { kind: Kind; size: number }, more: object = {}) {
  return {
    v: 1, position, finished: heldBy.every(Boolean), troop: { kind, size: heldBy.length, held: heldBy }, sky: bunches, next, slips: 0,
    parade: [{ kind: 'crab', size: 3, balloons: 3 }, { kind: 'duck', size: 2, balloons: 1 }, { kind: 'frog', size: 1, balloons: 1 }, { kind: 'hippo', size: 2, balloons: 2 }],
    shown: { give: true, each: true, bunch: true }, rng: 12345, ...more,
  }
}

async function open(d: Driver, save: object): Promise<void> {
  // The page hands its last save to storage as it unloads: the first reload lets that happen, the second opens the saved game.
  await d.reload()
  await d.reload({ [SLOT]: save })
  await d.wait(400)
}

export default {
  enforce: true,
  // The audit's child is 5, so a new game opens on a pair, with a pair passing by.
  query: 'tier=0&seed=7',
  ignore: [
    // Blob shadows are flat discs lying on the hill, drawn without writing depth.
    '^scenery>shadows',
    // The ghost hand tests no depth and is drawn over everything; the sky is a backdrop far behind.
    '^scenery>ghost-hand', '^scenery>sky$',
    // A string is a cord two hundredths of a unit thick, so any touch reads as the whole of it sunk. Where each
    // one runs (from a knot down, from a hand up to a balloon) is reviewed on the contact sheets.
    '^scenery>strings',
    // The balloons are one batch of things that fly: bunches on their way down, balloons that got away, the scraps
    // of a pop and the drops of a cloud, all of which pass in front of whatever is behind them, as well as the
    // balloons at rest. The ones at rest are held by tests on the game's own layout: the balloons of a bunch, the
    // places in the sky, and a held balloon above its friend's head and below the row (layout.test.ts).
    '^scenery>balloons',
  ],
  allow: [
    { a: '^(friend|passer|leaving|waiting)-\\d>squash', kind: 'pose', upTo: 0.5, reason: 'A friend is a pool toy: its head, arms and funniest part are pillows welded onto its trunk, and they press into the trunk and each other as it squashes, nods and swings its arms.' },
    { a: '^scenery>hill', b: '^(friend|passer|leaving|waiting)-\\d>squash', kind: 'penetration', upTo: 0.3, reason: 'The hill is an air bed. A friend stands in it up to its feet, and one that lands on its bottom or its side, or sits down hard, sinks in for a moment.' },
    { a: '^scenery>far-hill', b: '^scenery>parade-', kind: 'penetration', upTo: 0.4, reason: 'The troops that were served stand upright on the far hill, whose skin slopes under them; they are a few pixels tall at that distance.' },
  ],
  moments: [
    // The pair passes by and takes its balloons, the child's pair walks in, the sky fills, the next troop comes to the edge.
    { name: 'a new game opens', run: (d) => d.wait(9000) },
    // The bunches swell, and the ghost hand taps one place and then another.
    { name: 'idle ladder', run: (d) => d.wait(19000) },
    {
      // Ducks: a catch, a refusal by tail, the ending cut short by a poke and by a pop, an ending left to play, one too many.
      name: 'a pair of ducks',
      run: async (d) => {
        await open(d, saved('pair-singles', 'duck', [false, false], [one('duck'), one('hippo'), one('crab'), one('duck'), one('hippo')], { kind: 'frog', size: 3 }))
        await d.tap(await sky(d, 0, 5))
        await d.wait(350)
        await d.tap(await sky(d, 1, 5))
        await d.wait(1500)
        await d.tap(await sky(d, 3, 5))
        await d.wait(1600)
        await d.tap(await friend(d, 0, 2))
        await d.wait(700)
        await d.tap(await held(d, 1, 2))
        await d.wait(900)
        await d.tap(await sky(d, 0, 5))
        await d.wait(8200)
        await d.tap(await sky(d, 3, 5))
        await d.wait(2800)
      },
    },
    {
      name: 'the scenery and the step-in',
      run: async (d) => {
        // The cloud over the troop, the hill, then the troop that waits: the ducks march off and three frogs walk in.
        await d.tap(await at(d, 0.47, 0.53))
        await d.wait(700)
        await d.tap(await at(d, 3, GROUND - 0.9))
        await d.wait(1100)
        await d.tap(await waiting(d))
        await d.wait(5200)
      },
    },
    {
      // Hippos: three served at once, the ending cut short by a bunch that carries the whole troop off, one more for the nearest alone.
      name: 'three hippos and bunches',
      run: async (d) => {
        await open(d, saved('bunches-own-colour', 'hippo', [false, false, false], [{ colour: 'hippo', count: 2 }, one('hippo'), { colour: 'hippo', count: 3 }], { kind: 'crab', size: 2 }))
        await d.tap(await sky(d, 2, 3))
        await d.wait(2200)
        await d.tap(await sky(d, 2, 3))
        await d.wait(3400)
        await d.tap(await sky(d, 1, 3))
        await d.wait(3000)
        await d.tap(await waiting(d))
        await d.wait(5000)
      },
    },
    {
      // Crabs: a bunch bigger than the served troop bumps the cloud, refusals that knock a held balloon, a pop, a bunch that gets away, a catch.
      name: 'two crabs and mixed bunches',
      run: async (d) => {
        await open(d, saved('bunches-mixed', 'crab', [true, true], [{ colour: 'duck', count: 2 }, one('crab'), { colour: 'frog', count: 3 }, { colour: 'crab', count: 3 }], { kind: 'duck', size: 2 }))
        await d.tap(await sky(d, 3, 4))
        await d.wait(3600)
        await d.tap(await sky(d, 0, 4))
        await d.wait(1500)
        await d.tap(await sky(d, 2, 4))
        await d.wait(1500)
        await d.tap(await held(d, 0, 2))
        await d.wait(700)
        await d.tap(await sky(d, 3, 4))
        await d.wait(3000)
        await d.tap(await sky(d, 1, 4))
        await d.wait(7500)
      },
    },
    {
      // A frog alone: a refusal by throat, a catch by tongue, the ending cut short by one too many, and the hippo that waits steps in.
      name: 'a frog alone',
      run: async (d) => {
        await open(d, saved('solo-two-colours', 'frog', [false], [one('crab'), one('frog'), one('frog'), one('crab')], { kind: 'hippo', size: 1 }))
        await d.tap(await sky(d, 0, 4))
        await d.wait(1500)
        await d.tap(await sky(d, 1, 4))
        await d.wait(1500)
        await d.tap(await sky(d, 2, 4))
        await d.wait(3000)
        await d.tap(await waiting(d))
        await d.wait(4500)
      },
    },
    {
      // A hippo that holds a balloon sneezes another colour away flat, and the first bunches are shown inside a step-in.
      name: 'a sneeze and the first bunches',
      run: async (d) => {
        await open(d, saved('bunches-own-colour', 'hippo', [true], [one('duck'), one('hippo')], { kind: 'frog', size: 3 }, { shown: { give: true, each: true, bunch: false } }))
        await d.tap(await sky(d, 0, 2))
        await d.wait(2400)
        await d.tap(await waiting(d))
        await d.wait(11000)
      },
    },
    { name: 'rest', run: (d) => d.wait(3000) },
  ],
} satisfies GameAudit
