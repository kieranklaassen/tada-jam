import type { GameAudit } from '../types.ts'

// Moon Phases: the orrery's moving parts (the moon on its arm, the gears, the
// child on the turning Earth) through everything a child does with them.
const audit: GameAudit = {
  enforce: true,
  moments: [
    { name: 'opening', run: async (d) => { await d.wait(6000) } },
    {
      name: 'moon dragged round',
      run: async (d) => {
        const moon = (await d.find('moon-arm:[0-9]+/moon:')) ?? [0.61, 0.62]
        await d.drag(moon, [0.8, 0.5], 900)
        const next = (await d.find('moon-arm:[0-9]+/moon:')) ?? [0.8, 0.5]
        await d.drag(next, [0.5, 0.35], 900)
        const last = (await d.find('moon-arm:[0-9]+/moon:')) ?? [0.5, 0.35]
        await d.drag(last, [0.25, 0.6], 900)
        await d.wait(800)
      },
    },
    {
      name: 'phases tapped',
      run: async (d) => {
        for (const at of [[0.53, 0.86], [0.91, 0.64], [0.29, 0.73], [0.43, 0.44]] as const) {
          await d.tap(at)
          await d.wait(1100)
        }
      },
    },
    { name: 'halves shown', run: async (d) => { await d.tap([0.146, 0.06]); await d.wait(1500) } },
    {
      name: 'standing on Earth and back',
      run: async (d) => {
        await d.tap([0.895, 0.13])
        await d.wait(2500)
        await d.tap([0.895, 0.13])
        await d.wait(2500)
      },
    },
    {
      name: 'day turned on the dial',
      run: async (d) => {
        await d.press([0.058, 0.975])
        await d.move([0.015, 0.917], 500)
        await d.move([0.058, 0.86], 500)
        await d.move([0.1, 0.917], 500)
        await d.release()
        await d.wait(800)
      },
    },
    { name: 'home moved', run: async (d) => { await d.tap([0.6, 0.4]); await d.wait(1500) } },
    { name: 'rest', run: async (d) => { await d.wait(5000) } },
  ],
  ignore: [
    // See-through shells and decals, not solids: Earth's air and clouds (the child stands in both), the glass
    // halves around the moon, and the soft contact shadows lying on the table.
    '^atmosphere', 'clouds', 'halves', 'contact-shadows',
  ],
  allow: [
    {
      a: 'arm-metal',
      b: 'fixed-metal',
      kind: 'penetration',
      reason: "The moon's arm turns on Earth's stand: the stand runs up through the arm's collar, and the beam's middle is hidden inside the collar.",
    },
  ],
}

export default audit
