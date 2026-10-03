import type { Driver, Frac, GameAudit } from '../types.ts'

// Fire Truck Hero: every yard of the designed order from a saved state, with
// the hose on each thing in each way the grid has (a gulp, its fill, too much,
// a sweep, water from a neighbour), each ending, the worm, the cat's walk and
// her jump to the roof, the bell and the drive to the next yard, a touch in
// the middle of a scene, and a rest. Places are given in the yard's own units
// and turned into screen points through the audit's hook.

type Hook = { projectFrac(p: readonly number[]): number[] | null }
type AuditWindow = { __jamAudit: Hook }

const SLOT = 'tada-jam:slot:fire-truck-hero'
const ALL = ['fire', 'pool', 'seed', 'patch', 'boat', 'wheel', 'cat']

// The spots, the truck and the bell, as in games/fire-truck-hero/layout.ts.
const SPOT = [[6.6, 2.8], [10.2, 2.6], [8.0, 6.2], [12.2, 6.0], [14.0, 3.7]] as const
const TRUCK = [2.6, 5.4] as const
const BELL = [4.6, 0.6] as const
const SAND = [12.5, 8.1] as const

/** A point of the yard, at a height, as a point of the screen. */
async function at(d: Driver, place: readonly [number, number], y = 0): Promise<Frac> {
  const p = await d.page.evaluate((point) => (window as unknown as AuditWindow).__jamAudit.projectFrac(point), [place[0], y, place[1]])
  return p ? [p[0], p[1]] : [0.5, 0.5]
}

/** Starts from a saved yard. The first reload lets the page write what it still held. */
async function yard(d: Driver, place: string, arrangement: number, seen: string[] = ALL): Promise<void> {
  await d.reload()
  await d.reload({ [SLOT]: { v: 1, position: place, finished: false, yard: { place, arrangement }, seen } })
  await d.wait(400)
}

async function gulps(d: Driver, place: readonly [number, number], count: number, y = 0, gap = 550): Promise<void> {
  for (let i = 0; i < count; i++) {
    await d.tap(await at(d, place, y))
    await d.wait(gap)
  }
}

async function hold(d: Driver, place: readonly [number, number], ms: number, y = 0): Promise<void> {
  await d.press(await at(d, place, y))
  await d.wait(ms)
  await d.release()
}

async function sweep(d: Driver, from: readonly [number, number], to: readonly [number, number], ms = 700): Promise<void> {
  await d.drag(await at(d, from), await at(d, to), ms)
}

export default {
  enforce: true,
  childAge: 2,
  query: 'seed=7',
  ignore: [
    // Water in the air, steam and ripples: many small things that fly through one another and are gone.
    'water-drops',
    'steam',
    'ripples',
    'hanging-drop',
    'peek-puff',
    // Soft contact shadows and the idle ring: flat decals with depth writing off, drawn over the sand.
    'shadows',
    'truck-shadow',
    'guide-ring',
    // The demonstration hand hovers over what it points at and is drawn see-through.
    'guide-hand',
  ],
  allow: [
    // The truck's own joints.
    { a: 'truck-shell', b: 'truck-yoke', upTo: 0.4, reason: "the nozzle's yoke turns in its socket on top of the pedestal, which is part of the shell" },
    { a: 'truck-shell', b: 'truck-barrel', upTo: 0.3, reason: "the barrel's fat back end turns in the cup on top of the pedestal, which is part of the shell" },
    { a: 'truck-shell', b: 'cat-', upTo: 0.2, reason: 'the cat sits on the hose reel at the back of the truck, which is part of the shell' },
    { a: 'pool-shell', b: 'duck-body', upTo: 0.2, reason: "the duck sits on the pool's floor until the water lifts it" },
    { a: 'truck-shell', b: 'truck-pupils', upTo: 0.7, reason: 'the pupils are set into the whites of the eyes, which are part of the shell' },
    // Things that float sit in the water, and the water line crosses them.
    { a: 'pool-water', b: 'duck-body', upTo: 0.6, reason: 'the duck floats: the water line crosses its body' },
    { a: 'pool-water', b: 'boat-hull', upTo: 0.7, reason: 'the boat floats low in the water, and rising water passes its flat bottom on the way up' },
    { a: 'boat-water', b: 'boat-hull', upTo: 0.7, reason: 'water gathers inside the boat and stands against its sides' },
    { a: 'ground', b: 'worm-body', upTo: 1, reason: 'the worm comes up out of the mud and goes back down into it' },
    // A thing's own parts where they join.
    { a: 'seed-bud', b: 'seed-shoot', kind: 'pose', upTo: 1, reason: 'the bud is the end of its stem: the stem runs up into it' },
    { a: 'seed-bud', b: 'seed-petals', kind: 'pose', upTo: 1, reason: 'the bud opens into the flower: for a moment the small bud is inside the opening petals' },
    { a: 'snail-shell', b: 'snail-body', kind: 'pose', upTo: 0.4, reason: "the snail's body comes out of its shell" },
    { a: 'snail-shell', b: 'snail-feelers', kind: 'pose', upTo: 0.6, reason: "the snail's feelers come out of its shell with its body" },
    { a: 'cat-body', b: 'cat-paw', kind: 'pose', upTo: 0.5, reason: 'her front paw rests against her body' },
    { a: 'cat-body', b: 'cat-tail', kind: 'pose', upTo: 0.3, reason: 'her tail is rooted in her body' },
    { a: 'cat-body', b: 'cat-skull', kind: 'pose', upTo: 0.3, reason: 'her head sits on her shoulders' },
    { a: 'cat-skull', b: 'cat-lids', kind: 'pose', upTo: 0.3, reason: 'her eyelids lie on her eyes' },
    { a: 'bee-body', b: 'bee-wings', kind: 'pose', upTo: 0.3, reason: 'her wings are rooted in her back' },
    // Contacts the game means.
    { a: 'bee-body', b: 'seed-petals', upTo: 0.25, reason: 'the bee sits on the open flower' },
    { a: 'gate-slats', b: 'gate-posts', upTo: 0.25, reason: 'the leaf of the gate is hinged on its post' },
    { a: 'boat-hull', b: 'cat-', upTo: 0.45, reason: 'the cat naps in the boat: she sits down into it' },
  ],
  moments: [
    {
      // A first visit: the truck shows the fire with one small spit, then the glow and the ghost hand.
      name: 'first-showing-and-idle',
      run: async (d) => {
        await yard(d, 'one-thing', 0, [])
        await d.wait(9000)
      },
    },
    {
      name: 'fire-out-and-logs-afloat',
      run: async (d) => {
        await yard(d, 'one-thing', 0)
        await sweep(d, [5.5, 7.6], [11, 4.6])
        await gulps(d, SPOT[2], 3, 0.6)
        await d.wait(7000)
        await gulps(d, SPOT[2], 2, 0.4)
        await d.wait(2500)
      },
    },
    {
      name: 'bell-and-drive',
      run: async (d) => {
        await yard(d, 'one-thing', 0)
        await gulps(d, BELL, 2, 1.3)
        await d.wait(4200)
        await gulps(d, BELL, 3, 1.3)
        await d.wait(5600)
      },
    },
    {
      name: 'touch-in-the-middle-of-the-drive',
      run: async (d) => {
        await yard(d, 'two-things', 0)
        await gulps(d, BELL, 3, 1.3)
        await d.wait(1500)
        await d.tap(await at(d, SAND))
        await d.wait(1800)
      },
    },
    {
      name: 'pool-fills-floats-and-runs-over',
      run: async (d) => {
        await yard(d, 'afloat', 0)
        await sweep(d, [5.6, 6.2], [10.6, 6.2])
        await gulps(d, [7.7, 6.2], 4)
        await d.wait(7400)
        await gulps(d, [7.7, 6.2], 2)
        await d.wait(3600)
        // The boat, aground beside the pool: a gulp, its fill, too much.
        await gulps(d, [8.35, 8.05], 4)
        await d.wait(1500)
      },
    },
    {
      name: 'boat-sinks-and-pops-up',
      run: async (d) => {
        await yard(d, 'afloat', 0)
        await gulps(d, [7.7, 6.2], 3)
        await gulps(d, [8.64, 6.25], 4)
        await d.wait(2600)
        await sweep(d, [6.4, 5.4], [9.8, 6.9], 500)
        await d.wait(1500)
      },
    },
    {
      name: 'marooned-cat',
      run: async (d) => {
        await yard(d, 'afloat', 2)
        await d.wait(1200)
        await gulps(d, [9.9, 2.6], 4)
        await d.wait(3200)
        await gulps(d, [10.8, 2.65], 2, 0.8)
        await d.wait(1500)
        await gulps(d, [9.9, 2.6], 2)
        await d.wait(3000)
      },
    },
    {
      name: 'seed-grows-and-the-bee-lands',
      run: async (d) => {
        await yard(d, 'one-thing', 1)
        await d.wait(3000)
        await gulps(d, SPOT[1], 3, 1.0, 800)
        await d.wait(7200)
        await gulps(d, SPOT[1], 2, 1.0)
        await d.wait(2200)
        await sweep(d, [7.4, 3.6], [12.6, 1.8], 500)
        await d.wait(2400)
      },
    },
    {
      name: 'snail-comes-out-and-the-worm',
      run: async (d) => {
        await yard(d, 'one-thing', 3)
        await d.wait(1500)
        await gulps(d, SPOT[2], 3)
        await d.wait(7800)
        await gulps(d, SPOT[2], 1)
        await gulps(d, SAND, 4)
        await d.wait(2000)
        await d.tap(await at(d, [5.6, 8.2]))
        await d.wait(2400)
      },
    },
    {
      name: 'cat-leaps-walks-and-takes-the-roof',
      run: async (d) => {
        await yard(d, 'two-things', 2)
        await d.wait(1500)
        await gulps(d, SPOT[4], 1, 0.9)
        await d.wait(1400)
        await sweep(d, [11.6, 5.6], [15.4, 2.2], 450)
        await d.wait(900)
        await gulps(d, SPOT[4], 2, 0.9)
        await d.wait(3400)
        // She has walked to another spot. Wherever she is, find her and go on.
        const cat = (await d.find('^cat-body$')) ?? (await at(d, SPOT[0], 0.9))
        await d.tap(cat)
        await d.wait(2600)
        await d.tap(await at(d, TRUCK, 1.2))
        await d.wait(2600)
        await gulps(d, SPOT[1], 3, 0.6)
        await d.wait(6500)
      },
    },
    {
      name: 'wheel-ticks-spins-and-blurs',
      run: async (d) => {
        await yard(d, 'two-things', 1)
        await gulps(d, SPOT[4], 1, 1.2)
        await d.wait(1200)
        await sweep(d, [11.6, 5.8], [15.2, 2.0], 450)
        await d.wait(900)
        await hold(d, SPOT[4], 2600, 1.2)
        await d.wait(2600)
      },
    },
    {
      name: 'downhill-to-the-seed',
      run: async (d) => {
        await yard(d, 'downhill', 0)
        await gulps(d, SPOT[1], 7, 0, 450)
        await d.wait(7200)
      },
    },
    {
      name: 'round-and-round',
      run: async (d) => {
        await yard(d, 'round-and-round', 1)
        await d.wait(1200)
        await hold(d, SPOT[2], 3400, 1.2)
        await d.wait(6500)
      },
    },
    {
      name: 'whole-garden',
      run: async (d) => {
        await yard(d, 'whole-garden', 0)
        await sweep(d, [5, 8], [15, 1.5], 900)
        await sweep(d, [15, 7.6], [5.4, 1.6], 900)
        for (const spot of SPOT) await gulps(d, spot, 1, 0.5, 350)
        await hold(d, SPOT[2], 1800, 1.2)
        await d.wait(3000)
        await gulps(d, BELL, 3, 1.3)
        await d.wait(5600)
      },
    },
    { name: 'rest', run: (d) => d.wait(5000) },
  ],
} satisfies GameAudit
