// Intersection audit for Pebble Table (scripts/jam-intersections.mjs).
// A four-year-old's first open: the story beat and the guidance ladder on
// Fair Feeding, a ten-stone spill, stones dealt to plates and the bowl, the
// knife cutting a leftover into halves, a sweep through the pile, then the
// Honest Scale with loose parts and Knock-Knock with its visitors.

import type { Driver, Frac, GameAudit } from '../types.ts'
import { BAG, DOOR, FEEDING, SCALE, type Point } from '../../../games/pebble-table/layout.ts'

type Audit = { main(): { scene: { getObjectByName(name: string): unknown } } | null; projectFrac(p: number[]): number[] | null }
type Instanced = { count: number; instanceMatrix: { array: ArrayLike<number> } }

const to3 = (p: Point, y: number) => [(p.x - 800) * 0.1, y, (p.y - 500) * 0.1]

async function spot(d: Driver, p: Point, y = 0): Promise<Frac> {
  const f = await d.page.evaluate((v) => (window as unknown as { __jamAudit: Audit }).__jamAudit.projectFrac(v), to3(p, y))
  if (!f) throw new Error('pebble-table: no camera yet')
  return [f[0], f[1]]
}

/** Table-plane positions of every drawn instance of a named instanced mesh. */
async function instances(d: Driver, name: string): Promise<Point[]> {
  const list = await d.page.evaluate((n) => {
    const audit = (window as unknown as { __jamAudit: Audit }).__jamAudit
    const mesh = audit.main()?.scene.getObjectByName(n) as Instanced | undefined
    if (!mesh) return []
    const out: number[][] = []
    for (let i = 0; i < mesh.count; i++) out.push([mesh.instanceMatrix.array[i * 16 + 12], mesh.instanceMatrix.array[i * 16 + 14]])
    return out
  }, name)
  return list.map(([x, z]) => ({ x: x / 0.1 + 800, y: z / 0.1 + 500 }))
}

const near = (a: Point, b: Point, r: number) => Math.hypot(a.x - b.x, a.y - b.y) < r
const onPlateOrBowl = (p: Point) => near(p, FEEDING.bowl, FEEDING.bowl.r + 30) || FEEDING.seats.some((seat) => near(p, seat.plate, FEEDING.plateRadius + 30))

/** The loose whole stone nearest `to`, skipping stones already on a plate or in the bowl. */
async function looseStone(d: Driver, to: Point, skip: (p: Point) => boolean = onPlateOrBowl): Promise<Point | null> {
  const stones = (await instances(d, 'stone-whole')).filter((p) => !skip(p) && p.x > 60 && p.x < 1400 && p.y > 60 && p.y < 940)
  stones.sort((a, b) => Math.hypot(a.x - to.x, a.y - to.y) - Math.hypot(b.x - to.x, b.y - to.y))
  return stones[0] ?? null
}

/** How high a held stone rides under the finger (physics3d.ts HOLD_HEIGHT). */
const HOLD_HEIGHT = 11

/** Press a stone and carry it to `to`; `via` is a spot the held stone passes right over, at the height it is held. */
async function carry(d: Driver, from: Point | null, to: Point, ms = 700, via?: Point) {
  if (!from) return
  await d.press(await spot(d, from, 1))
  if (via) await d.move(await spot(d, via, HOLD_HEIGHT), ms / 2)
  await d.move(await spot(d, to, 0), via ? ms / 2 : ms)
  await d.wait(66)
  await d.release()
}

async function tapNamed(d: Driver, pattern: string) {
  const at = await d.find(pattern)
  if (at) await d.tap(at)
}

const [right, left] = [FEEDING.seats[1], FEEDING.seats[4]]

export default {
  enforce: false,
  childAge: 4,
  // Fur shells and hedgehog quills are pushed out and swayed in their vertex
  // shaders, so the CPU copy the audit reads is not what is drawn, and each
  // quill is its own instance (its own object) planted in the body by design.
  // Both are reviewed by eye in the close-ups and contact sheets instead.
  ignore: ['guest-fur-', 'guest-quills-'],
  // Five moments: the contact sheet takes 16 close-ups plus six tiles a
  // moment, and more than about 46 tiles is more than one page can compose.
  moments: [
    {
      // First open: the bag tips one stone toward the hungry guest and the
      // ghost hand carries it to the plate; guests idle, rumble, and look.
      // Then a tap on the bag spills the rest.
      name: 'story-spill',
      run: async (d) => {
        await d.wait(6500)
        await d.tap(await spot(d, BAG, 6))
        await d.wait(2600)
      },
    },
    {
      // Stones dealt to a plate and the bowl, pokes, the knife cutting a
      // leftover into halves and quarters, a stone carried over a guest's
      // head to its plate, and a sweep through the pile.
      name: 'share',
      run: async (d) => {
        await carry(d, await looseStone(d, right.plate), right.plate, 650)
        await d.wait(400)
        await carry(d, await looseStone(d, FEEDING.bowl), FEEDING.bowl, 600)
        await d.wait(1200)
        await d.tap(await spot(d, right.guest, 6))
        await d.tap(await spot(d, left.guest, 6))
        await d.wait(600)
        await d.press(await spot(d, FEEDING.knifeRest, 1))
        await d.move(await spot(d, FEEDING.bowl, 0), 600)
        await d.wait(100)
        await d.release()
        await d.wait(900)
        await d.tap(await spot(d, FEEDING.bowl, 1))
        await d.wait(700)
        await d.tap(await spot(d, FEEDING.bowl, 1))
        await d.wait(1200)
        const beyond = { x: left.guest.x - 40, y: left.guest.y + 60 }
        await carry(d, await looseStone(d, beyond), left.plate, 900, left.guest)
        await d.wait(700)
        const stones = (await instances(d, 'stone-whole')).filter((p) => !onPlateOrBowl(p))
        const c = stones.length ? { x: stones.reduce((s, p) => s + p.x, 0) / stones.length, y: stones.reduce((s, p) => s + p.y, 0) / stones.length } : { x: 600, y: 600 }
        await d.drag(await spot(d, { x: c.x - 170, y: c.y + 40 }, 0), await spot(d, { x: c.x + 170, y: c.y - 20 }, 0), 900)
        await d.wait(1600)
      },
    },
    // Idle long enough for the glow, a rumble, and a ghost-hand demonstration.
    { name: 'idle-feeding', run: (d) => d.wait(6200) },
    {
      // The Honest Scale: stones and loose parts on both pans, then idle for
      // the ghost stone's toPan demonstration.
      name: 'scale',
      run: async (d) => {
        await tapNamed(d, 'chooser-scale')
        await d.wait(1600)
        await carry(d, await looseStone(d, SCALE.pans[0]), SCALE.pans[0], 700)
        await d.wait(300)
        await carry(d, await looseStone(d, SCALE.pans[1], (p) => onPlateOrBowl(p) || SCALE.pans.some((pan) => near(p, pan, pan.r + 20))), SCALE.pans[1], 700)
        await d.wait(600)
        for (const jar of ['jar-acorn', 'jar-shell', 'jar-stick', 'boulder-nest']) {
          await tapNamed(d, jar)
          await d.wait(250)
        }
        await d.wait(1800)
        const parts = await instances(d, 'part-acorn')
        if (parts[0]) await carry(d, parts[0], SCALE.pans[1], 700)
        const sticks = await instances(d, 'part-stick')
        if (sticks[0]) await carry(d, sticks[0], SCALE.pans[0], 700)
        await d.wait(2200)
        await d.wait(5600)
      },
    },
    {
      // Knock-Knock: knocks, visitors in, a poke, then rest.
      name: 'door',
      run: async (d) => {
        await tapNamed(d, 'chooser-door')
        await d.wait(1400)
        for (let i = 0; i < 3; i++) {
          await d.tap(await spot(d, DOOR.door, 6))
          await d.wait(250)
        }
        await d.wait(3800)
        const mice = await instances(d, 'visitor-mice')
        if (mice[0]) await d.tap(await spot(d, mice[0], 4))
        await d.wait(3000)
      },
    },
  ],
} satisfies GameAudit
