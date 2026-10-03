import type { Driver, Frac, GameAudit } from '../types.ts'

// Hats for All: foam creatures in a row, a tile of hats in front of them, an
// arch they come and go through. The moments start from saved worlds, so each
// reaches its state at once: every creature under every kind of hat (the
// fifteen acts of the tastes), towers of two and the tower of three that
// falls, loose hats beside their spots, a hat carried about in the hand, a
// creature pulled to another, to the tile and to nowhere, each scene played
// out and each scene ended by a touch in the middle, and a finished crew at
// rest with the next crew's first in the arch.

const SLOT = 'tada-jam:slot:hats-for-all'
const KINDS = ['bop', 'lanky', 'flop', 'wig', 'pip'] as const
type Kind = (typeof KINDS)[number]
type Hat = 'cone' | 'dome' | 'brim'
type Creature = { kind: Kind; spot: number; hats: number[] }
type World = { crew: Creature[]; tile: Hat[]; loose?: { hat: number; spot: number }[]; changes?: ('come' | 'leave')[]; guest?: Kind | null; leaver?: number | null; finished?: boolean; position?: string }

/** A save as the game writes it (save.ts), around one world. The first showing is marked as played. */
function save(world: World): object {
  return {
    v: 1, position: world.position ?? 'spare-hat', finished: world.finished ?? false, seed: 12345, shown: true,
    crew: world.crew, tile: world.tile, loose: world.loose ?? [], changes: world.changes ?? [], guest: world.guest ?? null, leaver: world.leaver ?? null, slips: 0,
  }
}

/** Opens the game on a saved world. The first reload lets the game's own last save land, so it cannot write over the second. */
async function open(d: Driver, world: World | null): Promise<void> {
  await d.reload()
  await d.reload({ [SLOT]: world ? save(world) : null })
  await d.wait(400)
}

const crew = (kinds: readonly Kind[], hats: number[][] = []): Creature[] => kinds.map((kind, i) => ({ kind, spot: kinds.length === 5 ? i : i + 1, hats: hats[i] ?? [] }))
const hat = async (d: Driver, n: number): Promise<Frac> => (await d.find(`^hat-${n}( |$)`)) ?? [0.4, 0.68]
const creature = async (d: Driver, n: number): Promise<Frac> => (await d.find(`^creature-${n}-body( |$)`)) ?? [0.4, 0.45]
const TILE: Frac = [0.2, 0.7]
const FLOOR: Frac = [0.55, 0.9]
const ARCH: Frac = [0.79, 0.3]

/** Every creature of the five under one kind of hat: five of the fifteen acts, and then one walks out. */
function tastes(kind: Hat) {
  return async (d: Driver): Promise<void> => {
    await open(d, { crew: crew(KINDS), tile: [kind, kind, kind, kind, kind], changes: ['leave'], leaver: 2, position: 'one-leaves' })
    for (let n = 0; n < 5; n++) {
      await d.tap(await creature(d, n))
      await d.wait(2100)
    }
    // Each does its trick again on a tap, then the crew is left alone and one walks out, tossing its hat.
    for (let n = 0; n < 5; n += 2) {
      await d.tap(await creature(d, n))
      await d.wait(1200)
    }
    await d.wait(9500)
  }
}

const audit: GameAudit = {
  enforce: true,
  query: 'tier=0&seed=11',
  childAge: 2,
  sampleMs: 200,
  ignore: [
    // Soft contact shadows and the idle ladder's glow rings: flat decals with depth writing off, drawn over whatever is under them.
    'shadow-blobs',
    'glow-blobs',
    // The demonstration hand is a screen-facing sprite drawn without a depth test.
    'ghost-hand',
    // Pupils and mouths: flat discs with no thickness, laid just in front of the face.
    '^dots',
    // The room's floor and wall: two planes behind and under everything.
    '^room$',
  ],
  allow: [],
  moments: [
    // A first visit: the first showing plays, then the glow and the ghost hand come up over an idle child.
    { name: 'first-showing-and-idle', run: async (d) => { await open(d, null); await d.wait(12500) } },
    { name: 'first-showing-touched', run: async (d) => { await open(d, null); await d.wait(1500); await d.tap(FLOOR); await d.wait(1500); await d.tap(await creature(d, 1)); await d.wait(2500) } },
    { name: 'tastes-cone', run: tastes('cone') },
    { name: 'tastes-dome', run: tastes('dome') },
    { name: 'tastes-brim', run: tastes('brim') },
    {
      // A second hat on one head, a tap on the tower, a third hat and the fall; then the same on the tallest creature.
      name: 'towers',
      run: async (d) => {
        await open(d, { crew: crew(['bop', 'lanky', 'wig']), tile: ['cone', 'dome', 'brim', 'cone', 'dome'] })
        for (const n of [0, 1]) {
          await d.drag(await hat(d, n === 0 ? 0 : 3), await creature(d, n), 500)
          await d.wait(900)
          await d.drag(await hat(d, n === 0 ? 1 : 4), await creature(d, n), 500)
          await d.wait(1800)
          await d.tap(await creature(d, n))
          await d.wait(1800)
        }
        await d.drag(await hat(d, 2), await creature(d, 0), 500)
        await d.wait(2500)
        // The top of one tower carried to the other creature's single hat: the tower changes heads.
        await d.drag(await hat(d, 4), await creature(d, 2), 600)
        await d.wait(2000)
        await d.tap(await hat(d, 4))
        await d.wait(1500)
      },
    },
    {
      // Hats with nobody under them: two out by taps, one carried to the floor, one home, one onto a hatted head.
      name: 'loose-hats',
      run: async (d) => {
        await open(d, { crew: crew(['flop', 'pip'], [[0], [1]]), tile: ['dome', 'brim', 'cone', 'dome', 'brim'] })
        await d.tap(await hat(d, 2))
        await d.wait(1500)
        await d.tap(await hat(d, 3))
        await d.wait(3000)
        await d.drag(await hat(d, 4), FLOOR, 600)
        await d.wait(2500)
        await d.tap(await hat(d, 2))
        await d.wait(1500)
        await d.drag(await hat(d, 3), await creature(d, 0), 600)
        await d.wait(2200)
        await d.drag(await hat(d, 0), FLOOR, 600)
        await d.wait(2200)
        await d.drag(await hat(d, 1), TILE, 600)
        await d.wait(2200)
      },
    },
    {
      // A hat in the hand, carried over every head, the loose hat, the tile and the arch before it is let go.
      name: 'hat-carried-about',
      run: async (d) => {
        await open(d, { crew: crew(['lanky', 'bop', 'wig', 'pip'], [[0], [], [1, 2], []]), tile: ['brim', 'cone', 'dome', 'cone', 'brim'], loose: [{ hat: 3, spot: 0 }] })
        await d.press(await hat(d, 4))
        await d.wait(300)
        for (const n of [0, 1, 2, 3]) await d.move(await creature(d, n), 500)
        await d.move(await hat(d, 3), 500)
        await d.move(TILE, 500)
        await d.move(ARCH, 600)
        await d.move(await creature(d, 1), 600)
        await d.release()
        await d.wait(2500)
        // And a hat taken off a head and carried the same way, let go on the tile.
        await d.press(await hat(d, 0))
        await d.wait(300)
        for (const n of [3, 2, 1]) await d.move(await creature(d, n), 450)
        await d.move(TILE, 600)
        await d.release()
        await d.wait(2500)
      },
    },
    {
      // A creature pulled to a bare one, a hatted one, the tile and nowhere: first a bare creature, then a hatted one.
      name: 'creatures-pulled',
      run: async (d) => {
        await open(d, { crew: crew(['flop', 'bop', 'lanky', 'wig'], [[], [], [0], [1]]), tile: ['dome', 'cone', 'brim'] })
        for (const from of [0, 2]) {
          for (const to of [1, 3]) {
            await d.drag(await creature(d, from), await creature(d, to), 500)
            await d.wait(1900)
          }
          await d.drag(await creature(d, from), TILE, 500)
          await d.wait(2000)
          await d.drag(await creature(d, from), FLOOR, 500)
          await d.wait(1600)
        }
      },
    },
    {
      // One more walks in, is given the spare hat, the crew parades, and the next crew comes in on a tap of the arch.
      name: 'one-comes-and-the-parade',
      run: async (d) => {
        await open(d, { crew: crew(['wig', 'lanky', 'pip']), tile: ['dome', 'brim', 'cone', 'dome'], changes: ['come'], guest: 'bop', position: 'one-comes' })
        for (const n of [0, 1, 2]) { await d.tap(await creature(d, n)); await d.wait(900) }
        await d.wait(9500)
        await d.tap(await creature(d, 3))
        await d.wait(13500)
        await d.tap(ARCH)
        await d.wait(9500)
      },
    },
    {
      // A hat too few: one head waits bare, one walks out and tosses its hat, the loose hat goes to the bare head, the crew parades.
      name: 'one-short-and-one-leaves',
      run: async (d) => {
        await open(d, { crew: crew(['flop', 'bop', 'lanky', 'wig']), tile: ['brim', 'cone', 'dome'], changes: ['leave'], leaver: 2, position: 'one-short' })
        for (const n of [0, 1, 2]) { await d.tap(await hat(d, n)); await d.wait(900) }
        await d.wait(10500)
        const loose = await hat(d, 1)
        await d.tap(loose)
        await d.wait(13000)
      },
    },
    {
      // A touch in the middle of each scene: the walk out, the parade and the next crew's walk in all end at once.
      name: 'scenes-touched',
      run: async (d) => {
        await open(d, { crew: crew(['pip', 'wig', 'flop'], [[0], [1], [2]]), tile: ['cone', 'dome', 'brim'], changes: ['leave'], leaver: 1, position: 'one-leaves' })
        await d.wait(3600)
        await d.tap(FLOOR)
        await d.wait(800)
        await d.tap(await hat(d, 1))
        await d.wait(4200)
        await d.tap(FLOOR)
        await d.wait(1500)
        await d.tap(ARCH)
        await d.wait(2600)
        await d.tap(FLOOR)
        await d.wait(2500)
      },
    },
    {
      // A finished crew at rest, the next crew's first in the arch, the glow on it and the ghost hand; then the crew unsettled and set right, and its second parade.
      name: 'finished-and-at-rest',
      run: async (d) => {
        await open(d, { crew: crew(['bop', 'pip', 'lanky', 'flop'], [[0], [1], [2], [3]]), tile: ['brim', 'dome', 'cone', 'cone', 'brim'], finished: true, position: 'one-comes' })
        await d.wait(9000)
        await d.tap(await hat(d, 2))
        await d.wait(1500)
        await d.tap(await creature(d, 2))
        await d.wait(12500)
      },
    },
  ],
}

export default audit
