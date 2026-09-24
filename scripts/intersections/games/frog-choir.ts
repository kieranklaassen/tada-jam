// Frog Choir's intersection audit: a first loop of the firefly's song with
// the guidance ladder (invite, glow, the ghost hand's tap), every frog tapped
// at a quick child's pace while the firefly conducts, the firefly and empty
// pads and water tapped, a frog carried over two occupied pads before it is
// dropped on an empty one, a swap, a frog dropped in the water, a slow carry
// across the far pads, and a last loop with the frogs in their new seats.

import { columnX, PAD_TOP, PADS, rowZ } from '../../../games/frog-choir/layout.ts'
import type { Driver, Frac, GameAudit } from '../types.ts'

async function at(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: { projectFrac(p: number[]): number[] } }).__jamAudit.projectFrac(q), [x, y, z])
  return [p[0], p[1]]
}

const pad = (d: Driver, i: number) => at(d, PADS[i].x, PAD_TOP, PADS[i].z)
const water = (d: Driver, x: number, z: number) => at(d, x, 0, z)

async function frog(d: Driver, name: string): Promise<Frac> {
  return (await d.find(`^frog-${name}>skin`)) ?? [0.5, 0.5]
}

export default {
  enforce: true,
  allow: [
    { a: '^pond>water( |$)', b: '^pond>bank( |$)', kind: 'penetration', upTo: 0.26, reason: 'The bank mounds stand in the pond: their lower halves are under the water, where nothing shows.' },
    { a: '^pond>bank( |$)', b: '^pond>reeds( |$)', kind: 'penetration', upTo: 0.14, reason: 'The reeds are planted in the bank.' },
    { a: '^ripples( |$)', b: '^pond>bank( |$)', kind: 'penetration', upTo: 0.28, reason: 'A ripple is drawn on the water and runs into the shore, where the bank rises out of it.' },
    { a: '^ripples( |$)', b: '^pond>pads( |$)', kind: 'penetration', upTo: 0.1, reason: 'A ripple is drawn on the water and passes under a floating pad, whose underside is below the water.' },
    { a: '^(pond>water|ripples)( |$)', b: '^frog-\\w+>skin( |$)', kind: 'penetration', upTo: 0.3, reason: 'A frog dropped in the water dunks to its middle and bobs out; the water and its splash ring meet it at the waterline.' },
  ],
  // Inverted-hull outlines (BackSide copies of each mesh, pushed out along the
  // normals in the vertex shader) hold the same CPU geometry as the mesh they
  // outline, so the audit would read them as closed enclosures the size of the
  // frog. Their on-screen bands are reviewed in the contact sheet instead.
  ignore: ['outlines?:\\d+$'],
  moments: [
    // The firefly crosses all five frogs (1.3–4.3 s), the front frog invites (1.2–2.6 s),
    // the pads glow (3 s), and the ghost hand taps the front frog (5–8.2 s).
    { name: 'idle', run: (d) => d.wait(9500) },
    {
      name: 'taps',
      run: async (d) => {
        for (const name of ['showoff', 'bouncy', 'sleepy', 'shy', 'crooner', 'bouncy', 'showoff']) {
          await d.tap(await frog(d, name))
          await d.wait(320)
        }
        await d.wait(2600)
      },
    },
    {
      name: 'firefly-pads-water',
      run: async (d) => {
        await d.tap((await d.find('^firefly>body')) ?? [0.5, 0.3])
        await d.wait(300)
        for (const i of [1, 3, 5, 8, 11]) {
          await d.tap(await pad(d, i))
          await d.wait(250)
        }
        await d.tap(await water(d, -2.2, 0))
        await d.wait(250)
        await d.tap(await water(d, columnX(5), rowZ(0) + 0.6))
        await d.wait(1400)
      },
    },
    {
      name: 'carry-over-frogs',
      run: async (d) => {
        // The show-off hovers over the bouncy and the sleepy frogs' pads (they make room), then lands on an empty pad.
        await d.press(await frog(d, 'showoff'))
        await d.move(await pad(d, 2), 600)
        await d.wait(900)
        await d.move(await pad(d, 4), 600)
        await d.wait(900)
        await d.move(await pad(d, 6), 600)
        await d.wait(200)
        await d.release()
        await d.wait(900)
        // The shy frog is dropped on the crooner's pad: they swap.
        await d.drag(await frog(d, 'shy'), await pad(d, 9), 700)
        await d.wait(1600)
      },
    },
    {
      name: 'splash-and-previews',
      run: async (d) => {
        await d.drag(await frog(d, 'bouncy'), await water(d, -2.2, 0), 500)
        await d.wait(1500)
        // A slow carry over the far pads, trying each note, let go right above its own pad.
        await d.press(await frog(d, 'sleepy'))
        await d.move(await pad(d, 5), 700)
        await d.move(await pad(d, 3), 900)
        await d.move(await pad(d, 7), 900)
        await d.move(await pad(d, 4), 700)
        await d.wait(300)
        await d.release()
        await d.wait(1800)
      },
    },
    // The new tune plays through, and the ghost hand's drag demonstration arrives.
    { name: 'rest', run: (d) => d.wait(9000) },
  ],
} satisfies GameAudit
