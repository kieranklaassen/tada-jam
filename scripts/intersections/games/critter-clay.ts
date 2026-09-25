import type { Driver, Frac, GameAudit } from '../types.ts'

// Critter Clay: the demonstration pressing a leg onto the sleeping lump, the
// child dressing it fast from the tray (parts squishing on while the next
// one is already on its way), pulling parts back off so they fly home, the
// nose tap that wakes it and its hop off the turntable, then a busy bench of
// four critters built differently (six stubby legs, two long ones with a
// curly tail and floppy ears, a four-legged loper with a head, horns and a
// long tail) walking the way their parts say, greeting, being carried and
// dropped, dressed and undressed while awake, one put back to sleep, the
// turntable spun, and a rest. Clay is instanced: every instance is tagged
// with its owner (a critter and everything pressed on it, or a tray slot, a
// finger, a flight), and the script aims with the game's own ?probe=1 hook.

type Screen = { x: number; y: number }
type Seen = { id: number; mode: string; awake: boolean; parts: number; nose: Screen | null; body: Screen | null; spots: (Screen | null)[] }
type Probe = {
  tray(kind: string): Screen | null
  critters(): Seen[]
  socket(critterId: number, kind: string): Screen | null
  turntable(): Screen | null
}
type ProbeWindow = { __critterClayProbe?: Probe }

type Ask = { what: 'tray'; kind: string } | { what: 'socket'; id: number; kind: string } | { what: 'nose' | 'body'; id: number } | { what: 'spot'; id: number; index: number } | { what: 'turntable' }

async function aim(d: Driver, ask: Ask): Promise<Frac> {
  const at = await d.page.evaluate((q: Ask) => {
    const probe = (window as unknown as ProbeWindow).__critterClayProbe
    const canvas = document.querySelector('canvas')
    if (!probe || !canvas) return null
    const rect = canvas.getBoundingClientRect()
    let s: Screen | null = null
    if (q.what === 'tray') s = probe.tray(q.kind)
    else if (q.what === 'socket') s = probe.socket(q.id, q.kind)
    else if (q.what === 'turntable') s = probe.turntable()
    else {
      const c = probe.critters().find((one) => one.id === q.id)
      if (c) s = q.what === 'spot' ? (c.spots[q.index] ?? null) : q.what === 'nose' ? c.nose : c.body
    }
    return s ? [(rect.left + s.x) / window.innerWidth, (rect.top + s.y) / window.innerHeight] : null
  }, ask)
  return at ? [at[0], at[1]] : [0.5, 0.5]
}

async function sleeperId(d: Driver): Promise<number> {
  return d.page.evaluate(() => (window as unknown as ProbeWindow).__critterClayProbe?.critters().find((c) => !c.awake)?.id ?? 0)
}

/** Drag a part from its tray slot onto critter `id`, where it would sit. */
async function give(d: Driver, kind: string, id: number, ms = 520): Promise<void> {
  const from = await aim(d, { what: 'tray', kind })
  const to = await aim(d, { what: 'socket', id, kind })
  await d.drag(from, to, ms)
}

/** Pull the part at `index` off critter `id`, away from its body, so it pops and flies home. */
async function pull(d: Driver, id: number, index: number, toward: Frac): Promise<void> {
  await d.drag(await aim(d, { what: 'spot', id, index }), toward, 480)
}

const part = (kind: string, hue: number) => ({ kind, hue })

// Three awake critters and a sleeper, each built from different parts, placed apart on the bench.
const BUSY_BENCH = {
  v: 1,
  sleeper: { id: 5, hue: 1, parts: [part('eye', 0), part('legStub', 2), part('earRound', 0)], x: 0, z: 0, heading: 0, seed: 91 },
  awake: [
    { id: 1, hue: 0, parts: [...Array.from({ length: 6 }, () => part('legStub', 1)), part('eye', 2), part('eye', 2), part('earPoint', 1)], x: -32, z: 10, heading: 0.6, seed: 17 },
    { id: 2, hue: 2, parts: [part('legLong', 0), part('legLong', 0), part('tailCurl', 1), part('earFlop', 1), part('earFlop', 1), part('eye', 0)], x: 8, z: 12, heading: -1.2, seed: 29 },
    { id: 3, hue: 1, parts: [part('legLong', 2), part('legLong', 2), part('legLong', 2), part('legLong', 2), part('head', 0), part('horn', 2), part('horn', 2), part('tailLong', 0), part('eye', 2), part('eye', 2)], x: -36, z: -14, heading: 2.2, seed: 43 },
  ],
  tray: { legStub: 0, legLong: 1, eye: 1, earRound: 0, earPoint: 1, earFlop: 0, tailCurl: 1, tailLong: 0, head: 1, horn: 0 },
  nextHue: 2,
  nextId: 6,
}

export default {
  enforce: true,
  childAge: 4,
  query: 'tier=3&probe=1',
  ignore: [
    // Soft contact shadows under every clay piece: one instanced flat decal, depthWrite off and
    // polygon-offset, drawn over the bench, the turntable and the tray under whatever casts it.
    '^contact-shadows',
  ],
  allow: [
    {
      a: 'held-',
      b: 'critter-',
      upTo: 2.1,
      reason:
        'A part on the finger over a critter snaps most of the way to the socket it will take and shows itself pressed in there ' +
        '(the socket glow rings it): clay pressed into clay. It joins that critter the moment the finger lifts. Pressed fully home a part ' +
        "reads up to 1.7 here; a quarter still turned toward the finger's last movement, the horn reads 2.04 in the frames before it is let go.",
    },
    {
      a: '^clay-',
      b: '^clay-',
      kind: 'pose',
      upTo: 1.6,
      reason:
        "Parts pressed into one critter's clay: how deep each sits changes as the body squashes, breathes, hops, and splays its legs. " +
        'The tool keys pose history by instance index, and the clay batches hand their indices to other critters and parts as they are ' +
        'pressed on and pulled off, so the baselines mix critters (tool note 1). Cross-critter contact is still checked as penetration.',
    },
  ],
  moments: [
    // The lump snores and reaches toward the tray; at 5 s the ghost hand presses a leg onto it.
    { name: 'idle-guidance', run: (d) => d.wait(8800) },
    {
      name: 'dress-the-lump',
      run: async (d) => {
        const id = await sleeperId(d)
        await give(d, 'legStub', id)
        await d.wait(150)
        await give(d, 'eye', id)
        await d.wait(150)
        await give(d, 'legLong', id, 450)
        await d.wait(200)
        await give(d, 'horn', id, 450)
        await give(d, 'earFlop', id, 450)
        await give(d, 'tailCurl', id, 450)
        await give(d, 'head', id, 500)
        await d.wait(900)
      },
    },
    {
      name: 'pull-parts-off',
      run: async (d) => {
        const id = await sleeperId(d)
        await pull(d, id, 1, [0.62, 0.3])
        await d.wait(250)
        await pull(d, id, 3, [0.3, 0.75])
        await d.wait(900)
        await d.tap(await aim(d, { what: 'body', id }))
        await d.wait(700)
      },
    },
    {
      name: 'wake-and-walk',
      run: async (d) => {
        const id = await sleeperId(d)
        await d.tap(await aim(d, { what: 'nose', id }))
        await d.wait(5200)
      },
    },
    {
      name: 'busy-bench',
      run: async (d) => {
        await d.reload({ 'tada-jam:slot:critter-clay': BUSY_BENCH })
        await d.wait(3500)
        await d.tap(await aim(d, { what: 'body', id: 2 }))
        await d.wait(400)
        await d.tap(await aim(d, { what: 'body', id: 1 }))
        await d.wait(2600)
      },
    },
    {
      name: 'carry-and-drop',
      run: async (d) => {
        await d.drag(await aim(d, { what: 'body', id: 3 }), [0.42, 0.62], 700)
        await d.wait(1400)
        await d.drag(await aim(d, { what: 'body', id: 1 }), [0.3, 0.45], 600)
        await d.wait(1600)
      },
    },
    {
      name: 'dress-awake',
      run: async (d) => {
        await give(d, 'tailLong', 1, 500)
        await give(d, 'legLong', 2, 500)
        await d.wait(300)
        await give(d, 'earRound', 3, 450)
        await d.wait(600)
        await pull(d, 2, 3, [0.55, 0.2])
        await d.wait(300)
        await pull(d, 3, 4, [0.5, 0.85])
        await d.wait(2200)
      },
    },
    {
      name: 'wake-fourth',
      run: async (d) => {
        await d.tap(await aim(d, { what: 'nose', id: 5 }))
        await d.wait(4000)
      },
    },
    {
      name: 'back-to-sleep',
      run: async (d) => {
        await d.drag(await aim(d, { what: 'body', id: 2 }), await aim(d, { what: 'turntable' }), 800)
        await d.wait(2200)
        const t = await aim(d, { what: 'turntable' })
        await d.drag([t[0] - 0.06, t[1] + 0.04], [t[0] + 0.06, t[1] + 0.03], 350)
        await d.wait(1500)
      },
    },
    { name: 'rest', run: (d) => d.wait(4500) },
  ],
} satisfies GameAudit
