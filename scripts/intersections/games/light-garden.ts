// Light Garden's intersection audit: the opening with the guidance ladder
// (the lamp's peek, the idle glow, the ghost hand's demonstration), the lamp
// tapped so its beam wakes the moth, the prism carried out of the tray past
// the flying moth, a mirror carried over the prism and the lamp and dropped
// beside the lamp, the prism's knob swung round, the snail carried over the
// mirror and the lamp, a filter carried over two sleepers, the other lamp
// left at the panel's edge and turned, every creature poked twice and the
// panel rippled, pieces sent home to the tray, a full garden (all eight
// pieces out, all four awake), and two awake creatures set down right beside
// pieces, where they play on.
//
// Points are table centimetres (x right, y toward the child, h up), the same
// units as games/light-garden/layout.ts. The game's modules import each other
// without file extensions, so the few coordinates needed are written here.

import type { Driver, Frac, GameAudit } from '../types.ts'

async function at(d: Driver, x: number, y: number, h: number): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: { projectFrac(p: number[]): number[] } }).__jamAudit.projectFrac(q), [x, h, y])
  return [p[0], p[1]]
}

/** A piece's body is hit 2.5 cm up, a knob 2.4 cm up, a creature 1.5 cm above its height. */
const body = (d: Driver, x: number, y: number) => at(d, x, y, 2.5)
const knob = (d: Driver, x: number, y: number) => at(d, x, y, 2.4)
const table = (d: Driver, x: number, y: number) => at(d, x, y, 0)
const slot = (d: Driver, index: number) => body(d, -52.5 + index * 15, 50)

async function creature(d: Driver, kind: string): Promise<Frac> {
  return (await d.find(`(^|/)${kind}(:|$| )`)) ?? [0.5, 0.5]
}

/** Press, pass through each point in turn (`ms` each), and let go. */
async function carry(d: Driver, from: Frac, through: Frac[], ms: number): Promise<void> {
  await d.press(from)
  await d.wait(120)
  for (const point of through) await d.move(point, ms)
  await d.release()
}

const FULL_GARDEN = {
  v: 1,
  pieces: [
    { id: 'lampA', x: -46, y: 2, angle: 0.393, inTray: false },
    { id: 'lampB', x: 48.5, y: -24, angle: 2.685, inTray: false },
    { id: 'prism', x: -24, y: 11, angle: -2.12, inTray: false },
    { id: 'mirror1', x: -44, y: -24, angle: 0.4, inTray: false },
    { id: 'mirror2', x: 48, y: 24, angle: -0.8, inTray: false },
    { id: 'filterR', x: -10, y: -26, angle: 0, inTray: false },
    { id: 'filterG', x: 16, y: 27, angle: 1.2, inTray: false },
    { id: 'filterB', x: -46, y: 24, angle: 0.5, inTray: false },
  ],
  // Moth, fish, snail, jelly: each bed lies in exactly its own colour, so all four wake.
  beds: [
    { x: 0, y: 6 },
    { x: 26, y: -3 },
    { x: -30, y: 26 },
    { x: -23, y: -10 },
  ],
}

const audit: GameAudit = {
  enforce: true,
  moments: [
    // The lamp peeks (1.4 s), the panel glows (3 s), and the ghost hand shows the lamp tap (5–8 s).
    { name: 'opening', run: (d) => d.wait(9000) },
    {
      name: 'lamp tapped, the moth wakes',
      run: async (d) => {
        await d.tap(await body(d, -46, 2))
        await d.wait(4500)
      },
    },
    {
      name: 'prism carried out past the flying moth',
      run: async (d) => {
        await carry(d, await slot(d, 2), [await table(d, 2, 22), await table(d, -8, 16), await table(d, -24, 11)], 700)
        await d.wait(1500)
      },
    },
    {
      name: 'mirror carried over the prism and the lamp',
      run: async (d) => {
        await carry(d, await slot(d, 3), [await table(d, -24, 11), await table(d, -46, 2), await table(d, -40, -6)], 700)
        await d.wait(1500)
      },
    },
    {
      name: 'prism knob swung round',
      run: async (d) => {
        // Out of the tray the prism faces -90°, so its knob (at 180°, 9 cm out) points toward the child.
        await d.press(await knob(d, -24, 20))
        await d.wait(120)
        for (let k = 1; k <= 8; k++) {
          const a = Math.PI / 2 + (k * Math.PI) / 4
          await d.move(await knob(d, -24 + Math.cos(a) * 9, 11 + Math.sin(a) * 9), 220)
        }
        await d.release()
        await d.wait(1200)
      },
    },
    {
      name: 'snail carried over the mirror and the lamp',
      run: async (d) => {
        await carry(d, await creature(d, 'snail'), [await table(d, -38, -8), await table(d, -46, 2), await table(d, -28, -18)], 800)
        await d.wait(1500)
      },
    },
    {
      name: 'blue filter carried over the sleeping jelly and fish',
      run: async (d) => {
        await carry(d, await slot(d, 7), [await table(d, 36, 16), await table(d, 40, -18), await table(d, 20, -24)], 700)
        await d.wait(1200)
      },
    },
    {
      name: 'lamp dropped at the edge and turned twice',
      run: async (d) => {
        // Out of the tray a lamp faces +x, so its knob points out toward the left edge; it slides in to keep the knob on the panel.
        const lamp = () => d.find('(^|/)lampB(:|$| )')
        await carry(d, await slot(d, 1), [await table(d, -40, 20), await table(d, -58, -20)], 700)
        await d.wait(600)
        await d.tap((await lamp()) ?? (await body(d, -48, -20)))
        await d.wait(500)
        await d.tap((await lamp()) ?? (await body(d, -48, -20)))
        await d.wait(1200)
      },
    },
    {
      name: 'every creature poked twice, the panel rippled',
      run: async (d) => {
        for (const kind of ['moth', 'fish', 'snail', 'jelly']) {
          await d.tap(await creature(d, kind))
          await d.wait(500)
          await d.tap(await creature(d, kind))
          await d.wait(700)
        }
        await d.tap(await table(d, 20, 0))
        await d.wait(300)
        await d.tap(await table(d, -10, -26))
        await d.wait(1200)
      },
    },
    {
      name: 'mirror and prism sent home',
      run: async (d) => {
        await carry(d, await body(d, -40, -6), [await table(d, -20, 30), await table(d, -8, 48)], 500)
        await d.wait(400)
        await carry(d, await body(d, -24, 11), [await table(d, -22, 48)], 600)
        await d.wait(1500)
      },
    },
    {
      name: 'full garden',
      run: async (d) => {
        // The page flushes its pending save as it unloads, so the first reload lets that happen
        // and the second one starts from the full garden.
        await d.reload()
        await d.reload({ 'tada-jam:slot:light-garden': FULL_GARDEN })
        await d.wait(6500)
      },
    },
    {
      name: 'awake fish and jelly set down beside pieces',
      run: async (d) => {
        // Awake creatures play on for a while wherever they are set down, right next to the red filter and the lamp.
        await carry(d, await creature(d, 'fish'), [await table(d, 8, -20), await table(d, -4, -16)], 700)
        await d.wait(300)
        await carry(d, await creature(d, 'jelly'), [await table(d, -34, -4), await table(d, -40, 8)], 700)
        await d.wait(5000)
      },
    },
    { name: 'rest', run: (d) => d.wait(4000) },
  ],
}

export default audit
