import type { Driver, Frac, GameAudit } from '../types.ts'

// Muddy Truck Wash: the first showing (a drop on Tipper's dried nose), a wash
// with every tool in a right and a wrong order, each vehicle's like and
// dislike, the puddle three times, and three send-offs, so every vehicle of
// the roster stands in the bay, rolls in and drives out. Touches are placed
// from world points through the audit's own projection.

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
  await d.tap(await world(d, 4.5, 1.3, 0.4))
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
          await d.tap(await world(d, 4.1, 0, 1.45))
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
    { name: 'send off the fourth, mid-scene touch', run: async (d) => { await d.tap(await world(d, 4.5, 1.3, 0.4)); await d.wait(1500); await d.tap(await side(d, 0.5, 1.4)); await d.wait(2500) } },
    { name: 'rest', run: async (d) => { await d.wait(3000) } },
  ],
  // Drawn things with no body: the copy under the wet floor, flying drops and bubbles, the jet of the hose, the ghost hand.
  ignore: ['^mirror-', 'mirror-', '^fx$', '^jet$', '^ghost-hand$'],
  allow: [
    { a: 'lid', b: 'body', kind: 'pose', upTo: 1.8, reason: 'An eyelid is a shell over the lamp: it rolls back into the head as the eye opens and forward over the lamp as it shuts.' },
    { a: 'lid', b: 'pupil', kind: 'pose', upTo: 1.0, reason: 'The lid closes over the pupil, which lies on the lamp under it.' },
    { a: 'body', b: 'pupil', kind: 'pose', upTo: 0.15, reason: 'The pupil slides over the lamp, which is part of the body, as the eye looks about.' },
    { a: 'tipper-body', b: 'tipper-part', kind: 'pose', upTo: 0.3, reason: 'The bed is hinged on the chassis: its tail dips between the rails as the front lifts.' },
    { a: '-(body|part)', b: '-wheels', kind: 'pose', upTo: 0.2, reason: 'The body rides on its springs over its wheels, which sit up in their arches; a press brings it down on them.' },
    { a: 'tool-sponge', b: 'vehicle-', upTo: 0.25, reason: 'The sponge is soft and is pressed flat against the paint, the wheel, the mudguard or the lamp eye it is working on.' },
    { a: 'tool-cloth', b: 'vehicle-', upTo: 0.2, reason: 'The cloth is wiped along the paint and folds over whatever stands proud of it.' },
    { a: 'rack', b: 'tool-', upTo: 0.18, reason: 'A tool on the rack hangs on its arm, in its coil or sits in the suds of the bucket.' },
  ],
} satisfies GameAudit
