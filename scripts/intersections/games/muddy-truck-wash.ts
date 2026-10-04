import type { Driver, Frac, GameAudit } from '../types.ts'

// Muddy Truck Wash: the first showing (a drop on Tipper's dried nose), a wash
// with every tool in a right and a wrong order, each vehicle's like and
// dislike, the puddle three times, a knock on the tap, a touch on each piece of
// the place and on the two in the queue, and four send-offs, so every vehicle of
// the roster stands in the bay, rolls in, drives out and waits on the hill.
// Touches are placed from world points through the audit's own projection.

type AuditWindow = { __jamAudit: { projectFrac(p: readonly number[]): number[] | null } }

/** A world point as a fraction of the canvas. */
async function world(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  const at = await d.page.evaluate((p) => (window as unknown as AuditWindow).__jamAudit.projectFrac(p), [x, y, z])
  return at ? [at[0], at[1]] : [0.5, 0.5]
}

/** A point on the near side of the vehicle in the bay, in its own x and y. */
const side = (d: Driver, x: number, y: number): Promise<Frac> => world(d, x, y, 0.98)

async function take(d: Driver, tool: 'sponge' | 'hose' | 'cloth'): Promise<void> {
  const at = await d.find(`^tool-${tool}$`)
  if (at) await d.tap(at)
  await d.wait(250)
}

/** One rub along the side at a height, nose to tail. */
async function rub(d: Driver, y: number, from = -2.0, to = 2.1, ms = 800): Promise<void> {
  await d.drag(await side(d, from, y), await side(d, to, y), ms)
  await d.wait(120)
}

async function sendOff(d: Driver): Promise<void> {
  // Tapped twice, as a small child taps: the second tap lets the send-off play on.
  await d.tap(await world(d, 5.1, 1.2, 0.36))
  await d.wait(250)
  await d.tap(await world(d, 5.1, 1.2, 0.36))
  await d.wait(6800)
}

/** Every tool on the parts a taste can belong to: nose, eyes, wheels and the moving part. */
async function everyTaste(d: Driver): Promise<void> {
  for (const tool of ['hose', 'sponge', 'cloth'] as const) {
    await take(d, tool)
    for (const [x, y] of [[-1.9, 0.9], [-2.0, 1.5], [-1.4, 0.4], [1.0, 0.4], [-1.1, 2.4], [1.0, 2.1], [0.6, 1.5]] as const) {
      await d.tap(await side(d, x, y))
      await d.wait(900)
    }
  }
  // Hang the cloth up and poke the same places with a bare finger.
  await take(d, 'cloth')
  for (const [x, y] of [[-1.9, 0.9], [1.0, 2.1], [0.6, 1.5]] as const) {
    await d.tap(await side(d, x, y))
    await d.wait(700)
  }
}

export default {
  enforce: true,
  query: 'tier=0',
  childAge: 4,
  moments: [
    { name: 'first showing', run: async (d) => { await d.wait(5200) } },
    {
      name: 'wet and soap',
      run: async (d) => {
        await take(d, 'hose')
        for (const y of [0.5, 1.2, 1.9]) await rub(d, y)
        await take(d, 'sponge')
        for (const y of [0.5, 1.2, 1.9]) await rub(d, y)
      },
    },
    {
      name: 'sneeze',
      run: async (d) => {
        await take(d, 'cloth')
        await d.tap(await side(d, -1.9, 0.9))
        await d.wait(2200)
        await rub(d, 1.2, -1.0, 1.8)
      },
    },
    {
      name: 'rinse and dry',
      run: async (d) => {
        await take(d, 'hose')
        for (const y of [0.5, 1.2, 1.9]) await rub(d, y)
        // The jet on the floor in front of the vehicle, pushing the foam that lies there.
        await d.drag(await world(d, -1.5, 0, 2.9), await world(d, 1.8, 0, 3.1), 700)
        await d.wait(200)
        await take(d, 'cloth')
        for (const y of [0.5, 1.2, 1.9]) await rub(d, y)
        await take(d, 'cloth')
        await d.tap(await side(d, 0.8, 1.5))
        await d.wait(600)
      },
    },
    {
      name: 'puddle',
      run: async (d) => {
        for (const ms of [3200, 3200, 1200]) {
          await d.tap(await world(d, 4.45, 0, 2.05))
          await d.wait(ms)
        }
      },
    },
    { name: 'send off Tipper', run: sendOff },
    { name: 'second vehicle', run: everyTaste },
    { name: 'send off the second', run: sendOff },
    { name: 'third vehicle', run: everyTaste },
    { name: 'send off the third', run: sendOff },
    { name: 'fourth vehicle', run: everyTaste },
    { name: 'send off the fourth, mid-scene touch', run: async (d) => { await d.tap(await world(d, 5.1, 1.2, 0.36)); await d.wait(1500); await d.tap(await side(d, 0.5, 1.4)); await d.wait(2500) } },
    {
      name: 'the place and the queue',
      run: async (d) => {
        // Each piece of the place that answers a touch, twice in a row, and both of the two that wait on the hill.
        for (const name of ['^roller$', '^pinwheel$', '^shelf-things$', '^lamp$']) {
          const at = await d.find(name)
          if (!at) continue
          await d.tap(at)
          await d.wait(350)
          await d.tap(at)
          await d.wait(900)
        }
        for (const [x, z] of [[12.0, -8.2], [8.9, -8.9]] as const) {
          await d.tap(await world(d, x, 3.0, z))
          await d.wait(900)
        }
        // The five things that stand still and answer where the finger is: the bucket, a pool, the drain, the window and the pipe.
        for (const [x, y, z] of [[-3.6, 0.35, 2.05], [-1.3, 0, 3.75], [0.2, 0, 1.62], [2.0, 4.5, -2.7], [-1.0, 3.55, -2.4]] as const) {
          await d.tap(await world(d, x, y, z))
          await d.wait(700)
        }
      },
    },
    {
      name: 'the tap, and rest',
      run: async (d) => {
        // The tap is knocked once, then three times quickly: it swings on its arm and comes to rest.
        const tap = await d.find('^tap$')
        if (tap) {
          await d.tap(tap)
          await d.wait(1200)
          for (let i = 0; i < 3; i++) { await d.tap(tap); await d.wait(200) }
        }
        await d.wait(3000)
      },
    },
  ],
  // Drawn things with no body: the copy under the wet floor, flying drops and bubbles, the jet of the hose, the ghost hand,
  // and the lumps of mud and foam, which are soft stuff lying on the paint that a tool, a finger and each other go into.
  ignore: ['^mirror-', 'mirror-', '^fx$', '^jet$', '^ghost-', '-lumps'],
  allow: [
    { a: 'lid', b: 'body', kind: 'pose', upTo: 2.4, reason: 'An eyelid is a shell over the lamp: it rolls back into the head as the eye opens, further back when a brow is raised, and forward over the lamp as it shuts.' },
    { a: 'lid', b: 'pupil', kind: 'pose', upTo: 1.0, reason: 'The lid closes over the pupil, which lies on the lamp under it.' },
    { a: 'body', b: 'pupil', kind: 'pose', upTo: 0.15, reason: 'The pupil slides over the lamp, which is part of the body, as the eye looks about.' },
    { a: 'tipper-body', b: 'tipper-part', kind: 'pose', upTo: 0.3, reason: 'The bed is hinged on the chassis: its tail dips between the rails as the front lifts.' },
    { a: '-(body|part)', b: '-wheels', kind: 'pose', upTo: 0.2, reason: 'The body rides on its springs over its wheels, which sit up in their arches; a press brings it down on them.' },
    { a: 'tool-sponge', b: 'vehicle-', upTo: 0.25, reason: 'The sponge is soft and is pressed flat against the paint, the wheel, the mudguard or the lamp eye it is working on.' },
    { a: 'tool-cloth', b: 'vehicle-', upTo: 0.2, reason: 'The cloth is wiped along the paint and folds over whatever stands proud of it.' },
    { a: 'rack', b: '^tap', upTo: 0.3, reason: 'The tap hangs by its stem from the ball at the end of the rack\'s long arm, and swings about it.' },
    { a: '^place', b: '^roller', upTo: 0.15, reason: 'The roller brush turns on an axle that is seated in its foot and in the arm that holds its top to the wall.' },
    { a: 'rack', b: 'tool-', upTo: 0.18, reason: 'A tool on the rack hangs on its arm, in its coil or sits in the suds of the bucket.' },
  ],
} satisfies GameAudit
