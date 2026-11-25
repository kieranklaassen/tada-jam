import { FEATHERS, HALF_H, HALF_W } from '../../../games/mother-holle/layout.ts'
import type { Driver, Frac, GameAudit } from '../types.ts'

// Mother Holle's Quilt. Moments start from saved villages, so each reaches its
// state at once: the first visit left idle (the showing, the glow, the hand),
// the quilt shaken from end to end, a ride down a white hill into the hay, the
// jump over the pond and the pond itself, each sled's ride, heaps of two to
// four and one tipped off the top, the quilt over a heap of four, everybody
// touched, everybody lifted, the sneezes, the empty quilt and its plumping,
// and the evening. What bends in the model (that a heap is never over four,
// that nobody at rest is in anybody, that nobody is under the hill) is in
// games/mother-holle/play.test.ts.

const SLOT = 'tada-jam:slot:mother-holle'
type Id = 'walrus' | 'granny' | 'grandpa' | 'cow' | 'hen' | 'mayor'
type Saved = { x: number; on: Id | null; out: boolean; face: 1; cap: number; egg: boolean }
const at = (x: number, more: Partial<Saved> = {}): Saved => ({ x, on: null, out: true, face: 1, cap: 0, egg: false, ...more })
const HOME: Record<Id, Saved> = { walrus: at(-5.1), granny: at(-9, { out: false }), grandpa: at(-12.2, { out: false }), cow: at(0.6, { out: false }), hen: at(3.5), mayor: at(10.6) }
const white = (deep: number) => Array.from({ length: 120 }, () => deep)
const FULL = FEATHERS / 28

function village(bodies: Partial<Record<Id, Saved>> = {}, more: Record<string, unknown> = {}): object {
  return { v: 1, quilt: -3.9, empty: false, night: false, shown: true, snow: white(0), ...more, bodies: { ...HOME, ...bodies } }
}
const open = async (d: Driver, state: object | null) => { await d.reload(); await d.reload({ [SLOT]: state }); await d.wait(400) }
async function frac(d: Driver, x: number, y: number): Promise<Frac> {
  const size = await d.page.evaluate(() => { const c = document.querySelector('canvas')!; return [c.clientWidth, c.clientHeight] })
  const s = Math.min(size[0] / (HALF_W * 2), size[1] / (HALF_H * 2))
  return [0.5 + (x * s) / size[0], 0.5 - (y * s) / size[1]]
}
const tap = async (d: Driver, x: number, y: number) => d.tap(await frac(d, x, y))
const drag = async (d: Driver, x0: number, y0: number, x1: number, y1: number, ms = 900) => d.drag(await frac(d, x0, y0), await frac(d, x1, y1), ms)

const HEAP: Partial<Record<Id, Saved>> = { granny: at(0, { on: 'walrus' }), grandpa: at(0, { on: 'granny' }), hen: at(0, { on: 'grandpa' }) }
const ridden = (id: Id): Partial<Record<Id, Saved>> => ({ walrus: at(-12.2), [id]: at(-5.1) })

export default {
  enforce: true,
  query: 'tier=0',
  sampleMs: 200,
  ignore: ['^shadows$', '^ring$', '^ghost-hand$', '^bits$', '^sky', '^windows$', '^fountain$'],
  // Everybody is a stuffed toy of one piece with the next: a soft seat gives. What is allowed is that give, with a cap each.
  allow: [
    { a: '^(hill|snow|pond|hay|village)$', b: '^(hill|snow|pond|hay|village)$', reason: 'The land is laid in layers: snow on the hill, over the pond and against the stack, the pond in its hollow.' },
    { a: '^(sun|moon)$', b: '^(hill|sky|village)$', reason: 'The sun goes down behind the hills and the moon comes up.' },
    { a: '^holle', b: '^(holle|quilt|cloud)', reason: 'She sits in her cloud, and holds the featherbed in her fists against her.' },
    { a: '^quilt$', b: '^(holle|cloud|quilt)', reason: 'As above.' },
    ...(['walrus', 'granny', 'grandpa', 'cow', 'hen', 'mayor'] as const).map((id) => ({ a: `^${id}`, b: `^${id}`, reason: 'Parts of one sewn toy, stuffed against each other where they join.' })),
    { a: '^pond$', b: '^(walrus|granny|grandpa|cow|hen|mayor)', reason: 'They float in the pond, wade in it and go under in it.' },
    { a: '^grandpa', b: '^(hill|snow)$', upTo: 1, reason: 'He goes right under in the pond, through the thin snow that floats on it and down to its bed.' },
    { a: '^granny>granny-door', b: '^(hill|snow|hay)$', upTo: 1.6, reason: 'A thin board ploughs its edge into the bank beside the pond and into snow it lands on; measured against its own thinness.' },
    { a: '^granny>granny-door', b: '^(walrus|grandpa|cow|hen|mayor)', upTo: 1.05, reason: 'The same thin board pressed onto a soft head, or sat on by a chair.' },
    { a: '^(hill|snow)$', b: '^(walrus|granny|grandpa|cow|hen|mayor)', upTo: 0.3, reason: 'Runners and feet press into soft ground.' },
    { a: '^(walrus|granny|grandpa|cow|hen|mayor)', b: '^(walrus|granny|grandpa|cow|hen|mayor)', upTo: 0.6, reason: 'Whoever sits on a head sinks into it, as a stuffed toy on a stuffed toy does.' },
    { a: '^lanterns', b: '^(walrus|granny|grandpa|cow)', reason: 'A lantern hangs against its rider.' },
  ],
  moments: [
    { name: 'first-visit-left-idle', run: (d) => d.wait(9000) },
    { name: 'shaken-from-end-to-end', run: async (d) => { for (let k = 0; k < 3; k++) { await drag(d, -9, 5, 9, 5, 1400); await d.wait(1200) } } },
    ...(['walrus', 'granny', 'grandpa', 'cow'] as const).map((id) => ({ name: `ride-${id}`, run: async (d: Driver) => { await open(d, village(ridden(id), { snow: white(0.3) })); await tap(d, -5.1, -1.6); await d.wait(5200) } })),
    ...(['walrus', 'granny', 'grandpa', 'cow', 'hen', 'mayor'] as const).map((id) => ({ name: `in-the-pond-${id}`, run: async (d: Driver) => { await open(d, village({ ...(id === 'walrus' ? {} : { walrus: at(-12.2) }), [id]: at(7.2) })); await d.wait(1500); await tap(d, 7.2, -5.8); await d.wait(1200) } })),
    { name: 'a-heap-of-four-goes-down', run: async (d) => { await open(d, village(HEAP, { snow: white(0.3), quilt: 0 })); await tap(d, -5.1, -1.6); await d.wait(5200) } },
    { name: 'the-quilt-over-a-heap', run: async (d) => { await open(d, village(HEAP, { quilt: -5 })); await d.wait(800); await tap(d, -5.1, 7.5); await d.wait(1800) } },
    { name: 'everybody-touched', run: async (d) => { await open(d, village()); for (const [x, y] of [[-5.1, -1.8], [10.6, -5], [3.5, -5.6], [-8.3, -1.5], [0.5, -3.5]]) { await tap(d, x, y); await d.wait(1400) } } },
    { name: 'everybody-lifted', run: async (d) => { for (const [x, y] of [[-5.1, -1.8], [10.6, -5], [3.5, -5.6]]) { await open(d, village({}, { quilt: 8 })); await drag(d, x, y, 0, 0.2, 700); await d.wait(1800) } } },
    { name: 'one-set-on-another', run: async (d) => { await open(d, village({}, { quilt: 8 })); await drag(d, 10.6, -5, -5.1, 2, 900); await d.wait(1800) } },
    { name: 'snow-on-every-head', run: async (d) => { await open(d, village({ walrus: at(-5.1, { cap: 0.3 }), hen: at(3.5, { cap: 0.3 }), mayor: at(10.6, { cap: 0.3 }), granny: at(-8.7, { cap: 0.3 }), grandpa: at(-11.4, { cap: 0.3 }) })); await d.wait(600); await drag(d, -9, 5, 10, 5, 1600); await d.wait(2600) } },
    { name: 'the-empty-quilt-and-its-plumping', run: async (d) => { await open(d, village(HEAP, { empty: true, snow: white(FULL) })); await d.wait(1500); for (let k = 0; k < 4; k++) { await tap(d, -3.9, 7); await d.wait(500) } await d.wait(5000) } },
    { name: 'evening', run: async (d) => { await open(d, village({ granny: at(-8.7) }, { snow: white(0.25) })); await tap(d, 10.6, 5.3); await d.wait(9000) } },
  ],
} satisfies GameAudit
