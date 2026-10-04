import type { Driver, Frac, GameAudit } from '../types.ts'

// Claw Machine: a first visit with its idle guidance, the crate taken and the
// first showing; a sort by colour with a right toy, each colour gobbler's way
// with a wrong one, each lifted, the tray rung, the bells, the empty ledge
// and the claw waiting and wagging; the size crew and the kind crew the same
// way, with the ones who wait bonked, lobbing and heaving; the tip-out played
// through and ended by a touch; the ending, the crates and a delivery; stacks
// built, bounced off, toppled and knocked down; and a rest, with a finger on
// the watcher.
//
// Every moment starts from a saved state, so each reaches its part of the
// game directly. A toy's mesh is toy-<100 + its number in the load> after a
// reload; a gobbler's parts are named for the gobbler.

type Hook = { projectFrac(p: readonly number[]): number[] | null }
type AuditWindow = { __jamAudit: Hook }

const SLOT = 'tada-jam:slot:claw-machine'

/** Where a point of the cabinet is on the surface. */
async function at(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  const frac = await d.page.evaluate((p) => (window as unknown as AuditWindow).__jamAudit.projectFrac(p), [x, y, z])
  return frac ? [frac[0], frac[1]] : [0.5, 0.5]
}
const place = (d: Driver, p: number) => at(d, -15 + ((p % 5) + 0.5) * 6, 1.6, (Math.floor(p / 5) + 0.5) * 6)
const toy = async (d: Driver, n: number) => (await d.find(`^toy-${100 + n}$`)) ?? [0.5, 0.8] as Frac
/** A gobbler of a crew of two or three, by its place in the crew: its mouth. */
const gobbler = (d: Driver, slot: number, crew: number) => at(d, (slot - (crew - 1) / 2) * (crew <= 2 ? 14 : 12), 7.2, -4.5)
const ledge = (d: Driver, x = 0) => at(d, x, 8.5, -13.5)
const bell = (d: Driver, side: number) => at(d, side * 17, 3.6, 6)

/** Picks a toy up and lets it go on something. */
async function give(d: Driver, n: number, to: Frac, then = 3200): Promise<void> {
  await d.tap(await toy(d, n))
  await d.wait(2200)
  await d.tap(to)
  await d.wait(then)
}

const COLOURS = {"v":1,"position":"three-colours","finished":false,"cycle":{"from":"three-colours","harder":false,"crews":[["red","blue","yellow"]],"sort":0,"toys":[{"colour":"blue","kind":"duck","size":"small","place":9,"level":0},{"colour":"yellow","kind":"duck","size":"small","place":3,"level":0},{"colour":"yellow","kind":"duck","size":"small","place":0,"level":0},{"colour":"red","kind":"duck","size":"small","place":4,"level":0},{"colour":"blue","kind":"duck","size":"small","place":7,"level":0},{"colour":"red","kind":"duck","size":"small","place":8,"level":0}],"tried":[false,false,false,false,false,false],"misses":0},"shown":{"colour":true,"kind":true,"size":true},"crates":[]}
const SIZES = {"v":1,"position":"two-sizes","finished":false,"cycle":{"from":"two-sizes","harder":false,"crews":[["little","big"]],"sort":0,"toys":[{"colour":"yellow","kind":"car","size":"big","place":9,"level":0},{"colour":"yellow","kind":"car","size":"small","place":3,"level":0},{"colour":"yellow","kind":"car","size":"big","place":0,"level":0},{"colour":"yellow","kind":"car","size":"small","place":4,"level":0},{"colour":"yellow","kind":"car","size":"big","place":7,"level":0},{"colour":"yellow","kind":"car","size":"small","place":8,"level":0}],"tried":[false,false,false,false,false,false],"misses":0},"shown":{"colour":true,"kind":true,"size":true},"crates":[]}
const KINDS = {"v":1,"position":"three-ways-wide","finished":false,"cycle":{"from":"three-ways-wide","harder":false,"crews":[["red","blue","yellow"],["duck","car","rocket"],["little","big"]],"sort":1,"toys":[{"colour":"yellow","kind":"duck","size":"big","place":6,"level":0},{"colour":"red","kind":"car","size":"small","place":0,"level":0},{"colour":"red","kind":"rocket","size":"small","place":1,"level":0},{"colour":"blue","kind":"rocket","size":"big","place":3,"level":0},{"colour":"blue","kind":"car","size":"small","place":4,"level":0},{"colour":"red","kind":"duck","size":"big","place":2,"level":0},{"colour":"yellow","kind":"rocket","size":"small","place":7,"level":0},{"colour":"blue","kind":"duck","size":"big","place":5,"level":0},{"colour":"yellow","kind":"car","size":"small","place":8,"level":0}],"tried":[false,false,false,false,false,false,false,false,false],"misses":0},"shown":{"colour":true,"kind":true,"size":true},"crates":[]}
const TIP = {"v":1,"position":"colours-then-kinds","finished":false,"cycle":{"from":"colours-then-kinds","harder":false,"crews":[["red","blue","yellow"],["duck","rocket"]],"sort":0,"toys":[{"colour":"yellow","kind":"rocket","size":"small","slot":2,"nth":0},{"colour":"red","kind":"duck","size":"small","slot":0,"nth":0},{"colour":"blue","kind":"duck","size":"small","slot":1,"nth":0},{"colour":"yellow","kind":"duck","size":"small","slot":2,"nth":1},{"colour":"blue","kind":"rocket","size":"small","place":7,"level":0},{"colour":"red","kind":"rocket","size":"small","place":8,"level":0}],"tried":[true,true,true,true,false,false],"misses":0},"shown":{"colour":true,"kind":false,"size":false},"crates":[]}
const ENDING = {"v":1,"position":"three-ways-wide","finished":false,"cycle":{"from":"three-ways-wide","harder":false,"crews":[["red","blue","yellow"],["duck","car","rocket"],["little","big"]],"sort":2,"toys":[{"colour":"yellow","kind":"duck","size":"big","slot":1,"nth":0},{"colour":"red","kind":"car","size":"small","slot":0,"nth":0},{"colour":"red","kind":"rocket","size":"small","slot":0,"nth":1},{"colour":"blue","kind":"rocket","size":"big","slot":1,"nth":1},{"colour":"blue","kind":"car","size":"small","slot":0,"nth":2},{"colour":"red","kind":"duck","size":"big","slot":1,"nth":2},{"colour":"yellow","kind":"rocket","size":"small","slot":0,"nth":3},{"colour":"blue","kind":"duck","size":"big","slot":1,"nth":3},{"colour":"yellow","kind":"car","size":"small","place":5,"level":0}],"tried":[true,true,true,true,true,true,true,true,false],"misses":0},"shown":{"colour":true,"kind":true,"size":true},"crates":[]}
const STACKS = {"v":1,"position":"three-ways","finished":false,"cycle":{"from":"three-ways","harder":false,"crews":[["little","big"],["duck","car"],["red","yellow"]],"sort":0,"toys":[{"colour":"yellow","kind":"car","size":"small","place":6,"level":0},{"colour":"yellow","kind":"duck","size":"small","place":5,"level":0},{"colour":"red","kind":"duck","size":"small","place":8,"level":0},{"colour":"red","kind":"car","size":"big","place":0,"level":0},{"colour":"red","kind":"duck","size":"big","place":9,"level":0},{"colour":"red","kind":"car","size":"small","place":3,"level":0},{"colour":"yellow","kind":"duck","size":"big","place":7,"level":0},{"colour":"yellow","kind":"car","size":"big","place":4,"level":0}],"tried":[false,false,false,false,false,false,false,false],"misses":0},"shown":{"colour":true,"kind":true,"size":true},"crates":[]}

export default {
  enforce: true,
  query: 'tier=0&seed=7',
  ignore: [
    // Flat round contact shadows and the glow rings: decals with depth writing off, drawn on whatever is under them.
    '^shadows$',
    '^glow$',
    // The ghost hand is see-through and shows a move; it is not a thing in the cabinet.
    '^ghost-hand$',
    // The clear front of a belly: a pane with depth writing off, set a quarter stud inside its frame.
    '-window$',
  ],
  allow: [
    {
      a: 'gobbler-.*-body$', b: 'gobbler-.*-pupils$', kind: 'penetration', upTo: 0.75,
      reason: 'a pupil is a small ball set into the ball of its eye, so that it rides on the eye as the gobbler looks about; it is meant to sit half in it.',
    },
    {
      a: 'gobbler-.*-body$', b: 'gobbler-.*-pupils$', kind: 'pose', upTo: 0.75,
      reason: 'the same pupil, as it rides round its eye with the gaze: how far it sits in the ball changes a little as it goes.',
    },
    {
      a: 'watcher-body$', b: 'watcher-pupils$', kind: 'penetration', upTo: 0.6,
      reason: 'the watcher beside the tray has the same eyes as a gobbler: each pupil is a small ball set half into the ball of its eye.',
    },
    {
      a: 'watcher-body$', b: 'watcher-pupils$', kind: 'pose', upTo: 0.6,
      reason: 'the same pupil, as it rides round the watcher\'s eye with its gaze.',
    },
  ],
  moments: [
    {
      name: 'first-visit',
      run: async (d) => {
        await d.reload({ [SLOT]: null })
        // The glow at three seconds and the ghost hand at five, on the crate.
        await d.wait(9000)
        await d.tap(await ledge(d))
        // The delivery and the first showing of colour.
        await d.wait(12500)
      },
    },
    {
      name: 'colours',
      run: async (d) => {
        await d.reload({ [SLOT]: COLOURS })
        await d.wait(600)
        await give(d, 3, await gobbler(d, 0, 3)) // red duck to red: a gulp
        await give(d, 0, await gobbler(d, 0, 3), 4500) // blue duck to red: fired back
        await give(d, 1, await gobbler(d, 1, 3), 5200) // yellow duck to blue: slides off
        await give(d, 0, await gobbler(d, 2, 3), 4800) // blue duck to yellow: hiccups
        for (const slot of [0, 1, 2]) { await d.tap(await gobbler(d, slot, 3)); await d.wait(3600) } // each lifted
        await d.tap(await place(d, 6)); await d.wait(1500) // the tray rung
        await d.tap(await bell(d, 1)); await d.wait(2400)
        // The claw waits above a gobbler, then above a toy.
        await d.press(await gobbler(d, 1, 3)); await d.wait(2400); await d.move(await toy(d, 4), 500); await d.wait(1600); await d.release(); await d.wait(2400)
        await d.tap(await place(d, 6)); await d.wait(2600) // set down again
        // A wag over a toy knocks it along.
        const over = await toy(d, 5)
        await d.press(over)
        for (let i = 0; i < 8; i++) await d.move([over[0] + (i % 2 ? -0.05 : 0.05), over[1]], 130)
        await d.release(); await d.wait(2600)
        await d.tap(await place(d, 1)); await d.wait(2400)
        // The ledge with no one on it, and the rim by the bell.
        await d.tap(await ledge(d)); await d.wait(2400)
        await give(d, 4, await ledge(d), 3800)
        await give(d, 4, await bell(d, -1), 3400)
      },
    },
    {
      name: 'sizes',
      run: async (d) => {
        await d.reload({ [SLOT]: SIZES })
        await d.wait(600)
        await give(d, 0, await gobbler(d, 0, 2), 5200) // a big car on Little: it sits on its head
        await give(d, 1, await gobbler(d, 1, 2), 5200) // a small car in Big: it drops through
        await give(d, 0, await gobbler(d, 1, 2), 3800) // three chomps
        await give(d, 1, await gobbler(d, 0, 2))
        for (const slot of [0, 1]) { await d.tap(await gobbler(d, slot, 2)); await d.wait(3600) }
      },
    },
    {
      name: 'kinds',
      run: async (d) => {
        await d.reload({ [SLOT]: KINDS })
        await d.wait(600)
        await give(d, 1, await gobbler(d, 0, 3), 4600) // a car to the duck-head: shaken out
        await give(d, 0, await gobbler(d, 1, 3), 4800) // a duck to the car-head: it reverses
        await give(d, 1, await gobbler(d, 2, 3), 5200) // a car to the rocket-head: straight up
        await give(d, 0, await gobbler(d, 0, 3), 3800) // a big duck home
        for (const slot of [0, 1, 2]) { await d.tap(await gobbler(d, slot, 3)); await d.wait(3600) }
        // The ones who wait: bonked, lobbing a small toy back, heaving a big one, leaning and staring.
        await d.tap(await ledge(d, -7)); await d.wait(2600)
        await give(d, 1, await ledge(d, -7), 4200)
        await give(d, 3, await ledge(d, 7), 4600)
        const up = await ledge(d, 4)
        await d.press(up)
        for (let i = 0; i < 8; i++) await d.move([up[0] + (i % 2 ? -0.05 : 0.05), up[1]], 130)
        await d.wait(2600); await d.release(); await d.wait(2600)
      },
    },
    {
      name: 'tip-out',
      run: async (d) => {
        await d.reload({ [SLOT]: TIP })
        await d.wait(600)
        await give(d, 4, await gobbler(d, 1, 3))
        await give(d, 5, await gobbler(d, 0, 3))
        await d.tap(await ledge(d)); await d.wait(2600)
        // A touch in the middle of the scene ends it, and is then an ordinary touch.
        await d.tap(await place(d, 2)); await d.wait(3000)
        // And the whole scene, with the first showing of kind after it.
        await d.reload({ [SLOT]: TIP })
        await d.wait(600)
        await give(d, 4, await gobbler(d, 1, 3))
        await give(d, 5, await gobbler(d, 0, 3))
        await d.tap(await ledge(d)); await d.wait(11000)
      },
    },
    {
      name: 'ending',
      run: async (d) => {
        await d.reload({ [SLOT]: ENDING })
        await d.wait(600)
        await give(d, 8, await gobbler(d, 0, 2), 9500) // the last gulp, the tune, the burps and the crates
        await d.wait(6000) // the ending stands, and the ladder shows the crates
        await d.tap(await ledge(d, 8.6)); await d.wait(13000) // the taller crate
      },
    },
    {
      name: 'stacks',
      run: async (d) => {
        await d.reload({ [SLOT]: STACKS })
        await d.wait(600)
        await give(d, 0, await toy(d, 1), 2400) // a stack of two
        await give(d, 2, await toy(d, 0), 2400) // of three
        await give(d, 5, await toy(d, 2), 3000) // a fourth bounces off
        await d.press(await toy(d, 2)); await d.wait(2200); await d.release(); await d.wait(2600) // the claw waits, then takes the top
        await d.tap(await place(d, 2)); await d.wait(2600)
        await give(d, 3, await toy(d, 0), 3600) // a big toy on a stack of two: it comes down
        await give(d, 0, await toy(d, 1), 2400)
        const over = await toy(d, 0)
        await d.press(over)
        for (let i = 0; i < 8; i++) await d.move([over[0] + (i % 2 ? -0.05 : 0.05), over[1]], 130)
        await d.release(); await d.wait(3000) // dominoes
      },
    },
    {
      name: 'rest',
      run: async (d) => {
        // A finger on the watcher beside the tray: it hops and peeps, and the claw stays where it is.
        await d.tap(await at(d, 18.9, 3, 1.5)); await d.wait(1600)
        await d.wait(4400)
      },
    },
  ],
} satisfies GameAudit
