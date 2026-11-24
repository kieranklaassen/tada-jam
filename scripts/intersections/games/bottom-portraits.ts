import type { Driver, Frac, GameAudit } from '../types.ts'

// Bottom Portraits: everybody turned all the way round beside the widest
// neighbours, everybody called over, carried, changed for another and sent
// back, the table turned with four on it, and every act of the sheet's grid
// (painted from the front, the back and the side, hidden or cut off, in the
// board's hole), the secret, a picture hung while the next is asked for, and
// the seventh picture taking the oldest one's nail.

const SLOT = 'tada-jam:slot:bottom-portraits'
const CAST = ['elephant', 'hen', 'hippo', 'pig', 'giraffe', 'crocodile', 'board'] as const
type Id = (typeof CAST)[number]
type Saved = { spots: (Id | null)[]; turns?: Partial<Record<Id, number>>; wall?: unknown[]; last?: number; finished?: boolean }

function save({ spots, turns = {}, wall = [], last = -1, finished = false }: Saved): object {
  const rest = CAST.filter((id) => !spots.includes(id))
  return {
    v: 1, position: 'table', finished, painted: last >= 0, last, spots,
    homes: Array.from({ length: 6 }, (_, n) => rest[n] ?? null),
    turns: Object.fromEntries(CAST.map((id) => [id, turns[id] ?? 0])),
    wall: Array.from({ length: 6 }, (_, n) => wall[n] ?? null),
  }
}
const open = (d: Driver, saved: Saved): Promise<void> => d.reload({ [SLOT]: save(saved) })
async function touch(d: Driver, pattern: string, lift = 0): Promise<void> {
  const at = await d.find(pattern)
  if (!at) throw new Error(`bottom-portraits: nothing on screen is ${pattern}`)
  await d.tap([at[0], at[1] + lift] as Frac)
}
/** He is at the back: his hat is always in sight. */
const ask = (d: Driver): Promise<void> => touch(d, 'maestro-beret', 0.02)
const all = (turn: number): Partial<Record<Id, number>> => Object.fromEntries(CAST.map((id) => [id, turn]))
const FULL: (Id | null)[] = ['elephant', 'hippo', 'giraffe', 'crocodile']
const OTHERS: (Id | null)[] = ['hen', 'pig', 'board', null]

const painted = (name: string, saved: Saved) => ({ name, run: async (d: Driver) => { await open(d, saved); await ask(d); await d.wait(saved.spots.filter(Boolean).length > 2 ? 8000 : 6500) } })
/** Where a head is, for those whose body may be behind another. */
const HEAD: Record<Id, string> = { elephant: 'elephant-head', hen: 'hen-head', hippo: 'hippo-head', pig: 'pig-head', giraffe: 'giraffe-head', crocodile: 'crocodile-head', board: 'board-body' }

const audit = {
  enforce: true,
  query: 'tier=0&seed=1',
  childAge: 4,
  sampleMs: 200,
  ignore: [
    // Soft dark under everyone, the ring on what is wanted, the demonstration hand and the flecks above the canvas: flat or
    // passing marks.
    'shade', 'glow', 'ghost-hand', 'flecks',
    // Pupils and lids are caps a hair over the eyeball they roll on, in the head by design.
    '-pupils', '-lids',
  ],
  moments: [
    { name: 'idle-guidance', run: async (d) => { await open(d, { spots: ['elephant', null, null, null] }); await d.wait(10000) } },
    { name: 'turning-full', run: async (d) => { await open(d, { spots: FULL }); for (const id of FULL) for (let k = 0; k < 4; k++) { await touch(d, HEAD[id!]); await d.wait(700) } } },
    { name: 'turning-others', run: async (d) => { await open(d, { spots: ['pig', 'hen', 'hippo', 'elephant'] }); for (const id of ['pig', 'hen', 'hippo', 'elephant'] as Id[]) for (let k = 0; k < 4; k++) { await touch(d, HEAD[id]); await d.wait(500) } } },
    { name: 'turning-at-once', run: async (d) => { await open(d, { spots: ['hippo', 'elephant', 'board', 'giraffe'] }); for (let k = 0; k < 4; k++) { for (const id of ['hippo', 'elephant'] as Id[]) await touch(d, HEAD[id]); await d.wait(300) } } },
    painted('front-full', { spots: FULL, turns: all(2) }),
    painted('front-others', { spots: ['pig', 'hen', null, 'board'], turns: all(2) }),
    painted('back-full', { spots: FULL, turns: all(0) }),
    painted('back-others', { spots: ['pig', null, null, 'hen'], turns: all(0) }),
    painted('back-hen-before-another', { spots: ['hen', 'pig', 'elephant', 'hippo'], turns: all(0) }),
    painted('side-full', { spots: FULL, turns: all(1) }),
    painted('side-others', { spots: OTHERS, turns: { ...all(3), board: 1 } }),
    painted('hidden', { spots: ['crocodile', 'hen', 'hippo', 'elephant'], turns: { hippo: 1, elephant: 3 } }),
    painted('hidden-pig-and-cut', { spots: ['pig', 'hippo', 'elephant', 'giraffe'], turns: { pig: 2 } }),
    ...(['elephant', 'hen', 'hippo', 'pig', 'giraffe', 'crocodile'] as Id[]).map((id) => painted(`in-the-hole-${id}`, { spots: [id, null, 'board', null], turns: { [id]: 2, board: 2 } })),
    painted('secret', { spots: ['elephant', 'hippo', null, 'pig'] }),
    { name: 'called-over', run: async (d) => { await open(d, { spots: ['elephant', null, null, null] }); for (const id of ['hen', 'crocodile', 'pig', 'hippo', 'board', 'giraffe'] as Id[]) { await touch(d, HEAD[id]); await d.wait(1600) } } },
    { name: 'called-over-fast', run: async (d) => { await open(d, { spots: ['giraffe', null, null, null] }); for (const id of ['elephant', 'board', 'hippo'] as Id[]) { await touch(d, HEAD[id]); await d.wait(200) } await d.wait(2500) } },
    {
      name: 'carried',
      run: async (d) => {
        await open(d, { spots: ['elephant', 'giraffe', 'pig', 'hippo'] })
        for (const [id, to] of [['pig', [0.6, 0.6]], ['hippo', [0.15, 0.8]], ['elephant', [0.5, 0.95]], ['giraffe', [0.45, 0.5]]] as [Id, Frac][]) {
          const at = await d.find(HEAD[id])
          await d.drag(at!, to, 700)
          await d.wait(2200)
        }
      },
    },
    { name: 'last-one', run: async (d) => { await open(d, { spots: ['hippo', null, null, null] }); await d.drag((await d.find(HEAD.hippo))!, [0.5, 0.95], 600); await d.wait(2500) } },
    { name: 'table-turned', run: async (d) => { await open(d, { spots: FULL }); for (let k = 0; k < 4; k++) { await touch(d, 'table-key'); await d.wait(k === 1 ? 250 : 1200) } } },
    { name: 'shown-and-hung', run: async (d) => { await open(d, { spots: ['elephant', null, null, null] }); await ask(d); await d.wait(7000); await ask(d); await d.wait(8000); await touch(d, HEAD.elephant); await d.wait(1500) } },
    { name: 'seventh', run: async (d) => { const one = [['pig', 0], null, null, null]; await open(d, { spots: ['giraffe', null, null, null], wall: [one, one, one, one, one, one], last: 5 }); await ask(d); await d.wait(8000); await touch(d, HEAD.giraffe); await d.wait(1500); await ask(d); await d.wait(1500) } },
    { name: 'pokes', run: async (d) => { await open(d, { spots: FULL, wall: [[['hen', 0], null, null, null]], last: 0 }); for (const what of ['hung-0-face', 'table-top']) { await touch(d, what); await d.wait(700) } } },
  ],
} as GameAudit
const only = process.env.ONLY?.split(',')

if (only) audit.moments = audit.moments!.filter((m) => only.includes(m.name))
export default audit
