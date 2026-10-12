import { blank, cut, encode, poke } from '../../../games/box-fort/face.ts'
import { BLANKET_HOME, BOX_COUNT, CELL, COIL, CUSHIONS, FIRST_X, FLAP, FRONT_Z, GRAN, HEAP, HOOK, ROLL, SWITCH, TANGLE, WORN, kindOf } from '../../../games/box-fort/layout.ts'
import type { Driver, Frac, GameAudit } from '../types.ts'

// Box Fort: every act of the sheet's grid, each from a saved fort so the
// moment starts in the state it is about. The cat, the baby and the
// grandmother each meet a hole of every size (an eye, a paw, a head, a body,
// a door); boxes are stacked, tipped and folded away; the blanket, the
// cushions, the tape and the string of lights are each used rightly, wrongly
// and on each of the three; the room goes dark; the fort is taken apart.
// A cut is left waiting and carried on; a taped group, a box with the cat on
// it and a box with someone at it are carried; things are let go on bare rug;
// a box with no room hops back; a tunnel is used; the ladder shows its moves.
// A cushion is let go on an opening that already shows one; a tap lands beside
// a waiting line; a box tips with a line waiting on it; tape is patted down
// along a stacked seam; a second finger lands while the first cuts and carries.
//
// Nothing here makes anything of the renderer: the two modules it reads from
// the game are plain numbers, and the page is asked where things are.

const SLOT = 'tada-jam:slot:box-fort'
const RUG = -1, FLAT = -2

type Hook = { projectFrac(p: readonly number[]): number[] | null }
type Box = { x: number; on: number; side?: boolean; holes?: readonly (readonly number[])[] }
type Fort = {
  boxes?: Record<number, Box>
  tapes?: number[][]
  blanket?: number[]
  cushions?: number[]
  cushionAt?: number[]
  lump?: number | null
  lights?: number[]
  tangled?: boolean
  dark?: boolean
  cat?: { at: string; box: number; cell: number }
  baby?: number
  toys?: number[]
  gran?: { at: string; box: number }
  line?: { box: number; path: number[] }
}

/** The fort of a first visit at four: the big box and a small one stand, the rest lie flat. */
const FIRST: Record<number, Box> = { 0: { x: FIRST_X[0], on: RUG }, 3: { x: FIRST_X[3], on: RUG } }
/** The same by its other name: the two boxes of a first visit stand flush, so there is a seam. */
const FLUSH: Record<number, Box> = FIRST
/** Two storeys on both, with a hole of every size. */
const BUILT: Record<number, Box> = {
  0: { x: -35, on: RUG, holes: [[10, 40, 74, 104], [90, 2, 160, 104]] },
  3: { x: 130, on: RUG, holes: [[20, 20, 50, 50]] },
  1: { x: -35, on: 0, holes: [[30, 20, 80, 70]] },
  4: { x: 130, on: 3, holes: [[20, 30]] },
}

/** A saved record: a hole of four numbers is cut out, one of two is poked. */
function saved(fort: Fort = {}): object {
  const standing = fort.boxes ?? FIRST
  const boxes = Array.from({ length: BOX_COUNT }, (_, id) => {
    const kind = kindOf(id), face = blank(kind.cols, kind.rows), box = standing[id] ?? { x: FIRST_X[id], on: FLAT }
    for (const hole of box.holes ?? []) {
      if (hole.length === 2) poke(face, { x: hole[0], y: hole[1] })
      else cut(face, [{ x: hole[0], y: hole[1] }, { x: hole[2], y: hole[1] }, { x: hole[2], y: hole[3] }, { x: hole[0], y: hole[3] }])
    }
    return { id, x: box.x, on: box.on, side: box.side === true, holes: encode(face) }
  })
  const { boxes: _, ...rest } = fort
  return { v: 1, ...rest, boxes }
}

const withHole = (x0: number, y0: number, x1: number, y1: number, more: Fort = {}): Fort => ({ ...more, boxes: { 0: { ...FIRST[0], holes: [[x0, y0, x1, y1]] }, 3: FIRST[3] } })

/**
 * Starts a moment from a saved fort. The shell holds a save for two seconds and writes it when the page goes
 * away, which would be over a slot written just before: so the page is reloaded once with nothing, which lets
 * whatever the moment before left be written, and then again from the fort this moment is about.
 *
 * Between the two a few frames pass and a sample is taken. The audit keeps what it has measured of a piece under
 * the piece's name and the version of its geometry, and uses it again while both are as they were at the sample
 * before; a page loaded again draws its chance from the audit's seed again, so its geometries carry the
 * identifiers the page before gave them, and a piece that is laid out anew each frame (the blanket, the tape, the
 * string) has the same version after the same count of frames. Two loads with no frame between them had the
 * blanket of the first page measured against the boxes of the second, where no blanket was (the third run).
 */
async function from(d: Driver, fort: Fort = {}): Promise<void> {
  await d.reload()
  await d.wait(66)
  await d.sample()
  await d.reload({ [SLOT]: saved(fort) })
  await d.wait(300)
}

async function room(d: Driver, x: number, y: number, z = FRONT_Z): Promise<Frac> {
  const at = await d.page.evaluate((p) => (window as unknown as { __jamAudit: Hook }).__jamAudit.projectFrac(p), [x, y, z])
  return at ? [at[0], at[1]] : [0.5, 0.5]
}

const footOf = (boxes: Record<number, Box>, id: number): number => (boxes[id].on < 0 ? 0 : footOf(boxes, boxes[id].on) + kindOf(boxes[id].on).h)

/** A point of a standing box's face, in cells from its lower left corner. */
const onFace = (d: Driver, boxes: Record<number, Box>, id: number, cx: number, cy: number): Promise<Frac> =>
  room(d, boxes[id].x / 100 - kindOf(id).w / 2 + cx * CELL, footOf(boxes, id) + cy * CELL)

/** The lid flap a box is taken by: along the back edge of its top. */
const flap = (d: Driver, boxes: Record<number, Box>, id: number): Promise<Frac> =>
  room(d, boxes[id].x / 100, footOf(boxes, id) + kindOf(id).h + FLAP / 2, FRONT_Z - kindOf(id).d + 0.03)

/** Where a named thing is drawn. A moment that asks for a thing that is not drawn is a wrong moment: it stops there. */
const found = async (d: Driver, pattern: string): Promise<Frac> => {
  const at = await d.find(pattern)
  if (!at) throw new Error(`nothing drawn matches ${pattern}`)
  return at
}
/** One of the three, by the part of it that shows: its body or its head, and when those are behind board, whatever of it is out. */
const one = async (d: Driver, who: string, parts: string): Promise<Frac> => (await d.find(`(^|>)${who}-(${parts})$`)) ?? found(d, `^${who}>`)
const cat = (d: Driver): Promise<Frac> => one(d, 'cat', 'body|head')
const baby = (d: Driver): Promise<Frac> => one(d, 'baby', 'body|head')
const gran = (d: Driver): Promise<Frac> => one(d, 'gran', 'torso|body|head')
const roll = (d: Driver): Promise<Frac> => room(d, ROLL.x, ROLL.y, ROLL.z)
const heap = (d: Driver): Promise<Frac> => room(d, HEAP.x, 0.12, HEAP.z)
const blanket = (d: Driver): Promise<Frac> => room(d, BLANKET_HOME.x, BLANKET_HOME.y - 0.07, BLANKET_HOME.z + 0.16)
const cushion = (d: Driver, index: number): Promise<Frac> => room(d, CUSHIONS[index].x, CUSHIONS[index].y, CUSHIONS[index].z)
const coil = (d: Driver): Promise<Frac> => room(d, HOOK.x, HOOK.y - COIL * 0.55, HOOK.z + 0.08)
const tangle = (d: Driver): Promise<Frac> => room(d, TANGLE.x, TANGLE.y + 0.05, TANGLE.z)
const wallSwitch = (d: Driver): Promise<Frac> => room(d, SWITCH.x, SWITCH.y, SWITCH.z)
/** The loose end of the tape: out past the right side of the rightmost box on the rug. */
const tab = (d: Driver, right: number): Promise<Frac> => room(d, right + 0.19, 0.62, FRONT_Z + 0.04)
/** The arm of her chair that is turned to the room. */
const chairArm = (d: Driver): Promise<Frac> => room(d, GRAN.x + 0.8, 0.6, GRAN.z + 0.35)

/** The scissors go round a four-cornered line on a face until it closes on itself: the piece falls with the finger still down. */
async function cutSquare(d: Driver, boxes: Record<number, Box>, id: number, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0 + 1, y0 + 2]]
  await d.press(await onFace(d, boxes, id, x0, y0))
  for (const [cx, cy] of corners.slice(1)) await d.move(await onFace(d, boxes, id, cx, cy), 350)
  await d.release()
}

/** Takes what lies at the first place, carries it by each of the others, and lets it go at the last. */
async function carry(d: Driver, ...by: Frac[]): Promise<void> {
  await d.press(by[0])
  for (const next of by.slice(1)) await d.move(next, 450)
  await d.release()
}

async function tap(d: Driver, at: Frac, then: number): Promise<void> {
  await d.tap(at)
  await d.wait(then)
}

/** A second finger lands and lifts while the first pointer is still down: a touch, beside the pointer that works. */
async function secondFinger(d: Driver, at: Frac): Promise<void> {
  const size = d.page.viewportSize() ?? { width: 1180, height: 820 }
  await d.page.touchscreen.tap(at[0] * size.width, at[1] * size.height)
  await d.wait(400)
}

export default {
  enforce: true,
  query: 'tier=0&seed=1',
  childAge: 4,
  sampleMs: 100,
  ignore: [
    // The demonstration hand and the trail it leaves: flat marks drawn over whatever is under them, with no depth test.
    'ghost-hand',
    'ghost-trail',
    // Painted contact shadows on the floor and on the wall, and the light a hole throws on the wall and the rug in the dark:
    // flat cut-outs with depth writing off, laid a hair over the surface they are painted on.
    'ground-shadows',
    '^shadows$',
    'box-\\d-light',
    // The pencil line of a cut in the making lies on the face it is cutting.
    'cut-line',
  ],
  objects: [
    { match: '^cat', as: 'cat' },
    { match: '^baby', as: 'baby' },
    { match: '^gran', as: 'gran' },
    { match: '^scissors', as: 'scissors' },
  ],
  allow: [
    // Every entry here is a contact the game makes on purpose, and each cap is the depth a stepped check of every moment
    // measured, rounded up. A hole is cut out of the picture of a face, not out of its board, so whatever goes through a
    // hole is measured against the whole face: those entries name the cut face alone, never the box. A face is drawn
    // under the name of a cut face from its first hole on, so a face with no hole excuses nobody. Where in a cut face
    // the hole is, the audit cannot tell: a model test of the game holds that through every act the cat and the
    // grandmother are in a face, or pass one, only where it is cut away.
    { a: '^cat', b: '(^|>)box-\\d-face-cut$', kind: 'penetration', upTo: 0.25, reason: 'the cat at a hole: a paw reached out of a small one and the tips of its ears as its whole head comes out of a larger one. It passes where the board is cut away; the audit measures the uncut face' },
    { a: '^cat', b: '(^|>)box-\\d-face-cut$', kind: 'contained', reason: 'the cat\'s mouth as its head comes out through a hole: it is in the thickness of the board, where the board is cut away' },
    { a: '^gran', b: '(^|>)box-\\d-face-cut$', kind: 'penetration', upTo: 0.75, reason: 'the grandmother goes in by a door she fits, on her knees, and sits with her legs out of it; at a door too small her head goes in. Her face, her hat, her hands and her scarf pass where the board is cut away' },
    { a: '^gran', b: '(^|>)box-\\d-face-cut$', kind: 'contained', reason: 'the grandmother\'s mouth as her head goes in at a hole: it is in the thickness of the board, where the board is cut away' },
    { a: '^toy-', b: '(^|>)box-\\d-face-cut$', kind: 'penetration', upTo: 0.15, reason: 'a toy posted through a slot passes the face where the board is cut away, and one too big for the slot is pressed against it before it springs back' },
    { a: '^cushion-\\d', b: '^(baby|gran)', kind: 'penetration', upTo: 0.2, reason: 'the baby flops face down in a cushion, and the grandmother sits on one and squashes it flat' },
    { a: '^blanket$', b: '(^|>)baby-arm-(left|right)$', kind: 'penetration', upTo: 0.85, reason: 'the baby pulls the blanket over its own head: the fist that holds it up is in the cloth it holds' },
    { a: '^blanket$', b: '(^|>)cat-tail$', kind: 'penetration', upTo: 0.35, reason: 'under the blanket the cat is a lump that moves, with its tail out from under the edge: the tail crosses the hem it lies out under' },
    { a: '^string-of-lights$', b: '(^|>)gran-hand-(left|right)$', kind: 'penetration', upTo: 0.3, reason: 'the grandmother wears a loop of the string round her neck and knits on: the loop hangs over her hands' },
    { a: '^tape-roll$', b: '^baby', kind: 'penetration', upTo: 0.15, reason: 'the baby holds the roll up to its face in its hand before it bowls it' },
    { a: '^toy-ball$', b: '(^|>)baby-legs$', kind: 'penetration', upTo: 0.2, reason: 'the baby puts the ball down against its knee while its hand is busy' },
    { a: '^gran', b: '^gran', kind: 'pose', upTo: 1.05, reason: 'her scarf hangs from her needles down over her skirt; her skirt swings forward from under her to her knees as she sits down; and her hat, left outside a hole her head is in, hangs on the board over her brow' },
    { a: '^cat', b: '^cat', kind: 'pose', upTo: 1, reason: 'the cat is cut in flat parts that lie on one another: lying low with its ears flat they lie on its back, washing or curled up its paw is at its face, and stuck in a hole its back legs pedal against its own body. Hopping up onto a box it ducks with its ears flat, and with that the stepped check measures 0.95 over a whole run' },
  ],
  moments: [
    // The glow, the wriggle of the scissors and the demonstration hand drawing its window.
    { name: 'idle-guidance', run: async (d) => { await from(d); await d.wait(9000) } },
    {
      // After a first hole the hand shows the carry once; with a fort that has a hole standing, it shows the switch once.
      name: 'the-ladder-shows-the-carry-and-the-switch',
      run: async (d) => {
        await from(d)
        await cutSquare(d, FIRST, 0, 30, 30, 70, 70)
        await d.wait(22000)
        const lid = await flap(d, FIRST, 3)
        await carry(d, lid, [lid[0], lid[1] - 0.05])
        await d.wait(24000)
      },
    },
    {
      name: 'a-hole-cut-and-the-cat-looks-out',
      run: async (d) => {
        await from(d)
        await cutSquare(d, FIRST, 0, 30, 30, 70, 70)
        await d.wait(6000)
        // The piece that fell is a thing: touched, it rocks where it lies.
        await tap(d, await found(d, '(^|>)cut-piece$'), 800)
        // Touched at its hole, the cat goes back up on top.
        await tap(d, await onFace(d, FIRST, 0, 50, 50), 2500)
        // A second cut: on its way to the new hole the cat sweeps the first piece under the sofa with its tail.
        await cutSquare(d, FIRST, 0, 110, 30, 150, 70)
        await d.wait(6000)
      },
    },
    { name: 'a-peep-hole-and-an-eye', run: async (d) => { await from(d); await tap(d, await onFace(d, FIRST, 3, 40, 30), 6000) } },
    {
      // A hole the cat's whole head comes out of, and its head following what moves.
      name: 'the-cats-whole-head-at-a-hole',
      run: async (d) => {
        await from(d)
        await cutSquare(d, FIRST, 0, 30, 30, 84, 84)
        await d.wait(3000)
        await carry(d, await roll(d), await room(d, -0.9, 2.9))
        await d.wait(3000)
      },
    },
    {
      // The finger lifts before the line has closed: it waits, a finger near its end carries it on, and it closes. A second line runs out over the edge of the box.
      name: 'a-line-that-waits-and-is-carried-on',
      run: async (d) => {
        await from(d)
        await d.press(await onFace(d, FIRST, 0, 30, 30))
        await d.move(await onFace(d, FIRST, 0, 70, 30), 350)
        await d.move(await onFace(d, FIRST, 0, 70, 70), 350)
        await d.release()
        await d.wait(2500)
        await d.press(await onFace(d, FIRST, 0, 70, 71))
        await d.move(await onFace(d, FIRST, 0, 30, 70), 350)
        await d.move(await onFace(d, FIRST, 0, 31, 32), 350)
        await d.release()
        await d.wait(6000)
        await d.press(await onFace(d, FIRST, 3, 20, 30))
        await d.move(await onFace(d, FIRST, 3, 50, 50), 350)
        await d.move(await onFace(d, FIRST, 3, 96, 40), 350)
        await d.release()
        await d.wait(6000)
      },
    },
    { name: 'the-cat-walks-through-a-big-hole', run: async (d) => { await from(d, withHole(10, 40, 74, 104)); await tap(d, await cat(d), 5000) } },
    {
      name: 'the-cat-stuck-in-a-small-hole-and-popped-out',
      run: async (d) => {
        await from(d, withHole(20, 40, 70, 90))
        await tap(d, await cat(d), 6000)
        await tap(d, await cat(d), 3000)
      },
    },
    {
      name: 'the-cat-hops-onto-the-highest-fort',
      run: async (d) => { await from(d, { boxes: BUILT, cat: { at: 'rug', box: 0, cell: 0 } }); await tap(d, await cat(d), 3500) },
    },
    {
      name: 'the-baby-into-a-box-and-out',
      run: async (d) => {
        await from(d)
        await tap(d, await baby(d), 5000)
        await tap(d, await baby(d), 4000)
      },
    },
    {
      // No room beside the box for its feet, on either side: it crawls up to the box, pats it, and goes home.
      name: 'the-baby-pats-a-box-it-cannot-get-behind',
      run: async (d) => { await from(d, { boxes: { 0: { x: 40, on: RUG } }, lump: -110 }); await tap(d, await baby(d), 5000) },
    },
    { name: 'the-baby-posts-its-toys-through-a-slot', run: async (d) => { await from(d, withHole(20, 10, 36, 26)); await tap(d, await baby(d), 8000) } },
    { name: 'the-baby-crawls-in-after-its-toys', run: async (d) => { await from(d, withHole(10, 4, 80, 70)); await tap(d, await baby(d), 9000) } },
    {
      // A box that lies on its side is a tunnel: each of the three is sent to it, and the baby is called back out.
      name: 'a-tunnel-and-who-uses-it',
      run: async (d) => {
        await from(d, { boxes: { 0: FIRST[0], 1: { x: 135, on: RUG, side: true } } })
        await tap(d, await cat(d), 5000)
        await tap(d, await baby(d), 6000)
        await tap(d, await baby(d), 5000)
        await tap(d, await gran(d), 7000)
      },
    },
    {
      name: 'the-grandmother-wears-a-box-which-is-poked-given-a-cushion-and-passed-by-a-carried-box',
      run: async (d) => {
        await from(d)
        await tap(d, await gran(d), 6000)
        // The box she wears is hers: a hole poked in it brings no cat, and a cushion let go on it goes back.
        const worn = (cx: number, cy: number): Promise<Frac> => room(d, FIRST_X[3] / 100 - kindOf(3).w / 2 + cx * CELL, WORN + cy * CELL)
        await tap(d, await worn(14, 12), 2500)
        await carry(d, await cushion(d, 1), await worn(44, 12))
        await d.wait(2500)
        // A box carried towards her keeps to one side of her.
        await carry(d, await heap(d), await room(d, 1.3, 2.2), await room(d, 0.4, 2.2))
        await d.wait(1500)
        await tap(d, await gran(d), 6000)
      },
    },
    {
      name: 'the-grandmother-through-a-door',
      run: async (d) => {
        await from(d, withHole(90, 2, 160, 104))
        await tap(d, await gran(d), 6000)
        // The box she sits in is not taken from under her: it creaks and stays.
        await tap(d, await flap(d, FIRST, 0), 1000)
        await tap(d, await one(d, 'gran', 'head'), 6000)
      },
    },
    {
      // Her head goes in, her hat stays out, and she wears the box; touched again, she takes it off and has her hat back.
      name: 'the-grandmother-and-a-door-too-small',
      run: async (d) => {
        await from(d, withHole(60, 2, 120, 40))
        await tap(d, await gran(d), 8000)
        await tap(d, await gran(d), 6000)
        // A hole too small for her head as well: she bumps it with her hat on, and wears the box.
        await from(d, withHole(60, 2, 84, 26))
        await tap(d, await gran(d), 8000)
        await tap(d, await gran(d), 6000)
      },
    },
    {
      // Behind a stack she is reached by the arm of her chair.
      name: 'the-grandmother-reached-behind-a-stack',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]] })
        await tap(d, await chairArm(d), 6000)
        await tap(d, await gran(d), 6000)
      },
    },
    {
      name: 'all-three-in-the-built-fort',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]], blanket: [1, 4], cushions: [0, 0, -1], lights: [2, 3, 8, 9], cat: { at: 'in', box: 0, cell: 60 * 176 + 40 }, baby: 0, toys: [0, 0, -1], gran: { at: 'in', box: 0 } })
        await d.wait(3000)
        await tap(d, await one(d, 'gran', 'head'), 6000)
      },
    },
    {
      name: 'stacking-tipping-and-a-flush-seam',
      run: async (d) => {
        const one = { 0: { x: -35, on: RUG } }
        await from(d, { boxes: one })
        // Off the heap and squarely onto the big box, where the cat sits.
        await carry(d, await heap(d), await room(d, -0.35, 2.6))
        await d.wait(2200)
        // The next one let go half off: it tips and lies on its side as a tunnel.
        await carry(d, await heap(d), await room(d, 1.05, 2.4))
        await d.wait(1500)
        await from(d, { boxes: { 0: FIRST[0], 3: { x: 135, on: RUG } } })
        // Let go a hand's width from the big box, it stands flush against it.
        const lid = await room(d, 1.35, kindOf(3).h + FLAP / 2, FRONT_Z - kindOf(3).d + 0.03)
        await carry(d, lid, [lid[0] - 0.01, lid[1] - 0.04])
        await d.wait(1200)
      },
    },
    {
      // Dragged low by its lid and let go with the finger over the big box, the small box goes onto it. The big box
      // let go over the small one tips off it, and the cat jumps down from its lid first. A box off the heap that
      // finds the rug full and no box that can bear it goes back to the heap.
      name: 'boxes-dragged-low-onto-the-big-box-the-big-box-tipping-with-the-cat-on-it-a-heap-box-with-no-place-and-a-box-put-back',
      run: async (d) => {
        await from(d)
        const lid = await flap(d, FIRST, 3)
        await carry(d, lid, await room(d, 0.2, 1.1, FRONT_Z - kindOf(3).d + 0.03))
        await d.wait(1500)
        // Let go low against the side of the big box with no room beside it, it goes onto it too.
        await from(d)
        await carry(d, await flap(d, FIRST, 3), await room(d, 0.95, 1.0, FRONT_Z - kindOf(3).d + 0.03))
        await d.wait(1500)
        await from(d)
        const wide = await flap(d, FIRST, 0)
        await carry(d, wide, await room(d, -0.35, 2.9, FRONT_Z - kindOf(0).d + 0.03), await room(d, 1.3, 2.9, FRONT_Z - kindOf(0).d + 0.03))
        await d.wait(2500)
        await from(d)
        // The small box on top of the heap goes onto the big one; the middling one that comes next has nowhere to stand, let go low or high.
        await carry(d, await heap(d), await room(d, -0.3, 0.5))
        await d.wait(1500)
        await carry(d, await heap(d), await room(d, 1.3, 0.5))
        await d.wait(1200)
        await carry(d, await heap(d), await room(d, -0.3, 2.5))
        await d.wait(1200)
        await from(d)
        // Taken up and put back, and taken up and taken away by the game: whoever was on it is where they were.
        const big = await flap(d, FIRST, 0)
        await carry(d, big, [big[0], big[1] - 0.08], [big[0], big[1] - 0.01])
        await d.wait(1500)
      },
    },
    {
      // The two boxes of a first visit taped together and carried as one, with the cat riding on the big one.
      name: 'a-taped-group-carried',
      run: async (d) => {
        await from(d, { boxes: FLUSH, tapes: [[0, 3]], cushions: [-1, -1, -1], baby: 0 })
        const lid = await flap(d, FLUSH, 3)
        await carry(d, lid, [lid[0], lid[1] - 0.12], [lid[0] - 0.03, lid[1] - 0.12], [lid[0] - 0.03, lid[1] - 0.02])
        await d.wait(2500)
        await from(d, { boxes: { 0: { x: 40, on: RUG, holes: [[10, 40, 74, 104]] }, 3: { x: 40, on: 0 } }, tapes: [[0, 3]], cat: { at: 'look', box: 0, cell: 60 * 176 + 40 } })
        const upper = await room(d, 0.4, kindOf(0).h + kindOf(3).h + FLAP / 2, FRONT_Z - kindOf(3).d + 0.03)
        await carry(d, upper, [upper[0] - 0.1, upper[1] - 0.05], [upper[0] - 0.1, upper[1] + 0.02])
        await d.wait(2500)
      },
    },
    {
      name: 'tape-on-a-seam-on-nothing-and-on-the-three',
      run: async (d) => {
        await from(d, { boxes: FLUSH })
        await carry(d, await roll(d), await room(d, 0.75, 0.44))
        await d.wait(1200)
        // On one box with no seam under it, it sticks by its end, curls and springs back; pulled to nothing, it springs back.
        await carry(d, await roll(d), await room(d, -0.6, 1))
        await d.wait(1600)
        await carry(d, await roll(d), await room(d, -0.9, 2.9))
        await d.wait(1200)
        await carry(d, await roll(d), await cat(d))
        await d.wait(4000)
        await carry(d, await roll(d), await baby(d))
        await d.wait(5000)
        await carry(d, await roll(d), await gran(d))
        await d.wait(7000)
      },
    },
    {
      name: 'the-blanket-as-a-roof-sliding-off-and-on-the-three',
      run: async (d) => {
        await from(d)
        await carry(d, await blanket(d), await room(d, 0.2, 2))
        await d.wait(2200)
        await from(d, { boxes: { 0: { x: -35, on: RUG } } })
        await carry(d, await blanket(d), await room(d, -0.3, 2))
        await d.wait(2800)
        await from(d)
        await carry(d, await blanket(d), await cat(d))
        await d.wait(5000)
        await carry(d, await blanket(d), await baby(d))
        await d.wait(4000)
        await carry(d, await blanket(d), await gran(d))
        await d.wait(5000)
      },
    },
    {
      name: 'cushions-in-a-box-fired-out-and-on-the-three',
      run: async (d) => {
        await from(d, withHole(120, 20, 160, 60))
        for (const index of [0, 1, 2]) {
          await carry(d, await cushion(d, index), await onFace(d, FIRST, 0, 60, 60))
          await d.wait(index === 2 ? 2200 : 1200)
        }
        await from(d)
        await carry(d, await cushion(d, 1), await cat(d))
        await d.wait(6000)
        await carry(d, await cushion(d, 0), await baby(d))
        await d.wait(4000)
        await carry(d, await cushion(d, 2), await gran(d))
        await d.wait(5000)
      },
    },
    {
      // A cushion in a box is taken out through a hole it shows at; let go on bare rug it lies there; let go on a box with no hole it flops in front of it.
      name: 'cushions-out-of-a-hole-onto-the-rug-the-blanket-heaped-there-and-a-piece-and-the-baby-pushing-one-aside',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]], cushions: [0, 0, -1] })
        await carry(d, await found(d, '^cushion-1$'), await room(d, 0.9, 0.5, FRONT_Z + 0.4), await room(d, 0.9, 0.1, FRONT_Z + 0.4))
        await d.wait(1500)
        await carry(d, await cushion(d, 2), await room(d, 0.7, 0.1, FRONT_Z + 0.4))
        await d.wait(1500)
        await from(d, { boxes: { 0: FIRST[0] } })
        await carry(d, await cushion(d, 0), await onFace(d, FIRST, 0, 60, 60))
        await d.wait(1500)
        await carry(d, await cushion(d, 1), await room(d, 1.3, 0.1, FRONT_Z + 0.4))
        await d.wait(1500)
        // The blanket let go on bare rug lies there in a heap.
        await carry(d, await blanket(d), await room(d, 1.4, 0.4))
        await d.wait(2500)
        // A piece that falls where a cushion lies pushes it aside, and whoever crosses the rug there does too.
        await cutSquare(d, FIRST, 0, 30, 30, 70, 70)
        await d.wait(6000)
        await tap(d, await baby(d), 5000)
      },
    },
    {
      name: 'the-lights-draped-tangled-and-on-the-three',
      run: async (d) => {
        await from(d, { boxes: FLUSH })
        await carry(d, await coil(d), await room(d, 1.85, 0.85), await room(d, 0.75, 1.62), await room(d, -1.4, 1.62))
        await d.wait(2000)
        // Pulled back the way it came, it lets go of a corner at a time.
        await carry(d, await room(d, -1.4, 1.5), await room(d, -0.4, 2), await room(d, 0.9, 2), await room(d, 2.4, 1.2), await room(d, 2.5, 0.3))
        await d.wait(1500)
        await from(d)
        await carry(d, await coil(d), await room(d, 2.6, 2.4), await room(d, 2.5, 0.3))
        await d.wait(1500)
        await carry(d, await tangle(d), await room(d, 2.6, 0.6), await room(d, 2.6, 2.6))
        await d.wait(1500)
        // Let go high over the boxes with no corner caught, it falls all the way down in front of them into its tangle.
        await carry(d, await coil(d), await room(d, 2.4, 2.9), await room(d, -0.2, 2.9))
        await d.wait(1500)
        await carry(d, await tangle(d), await room(d, 2.6, 0.6), await room(d, 2.6, 2.6))
        await d.wait(1500)
        await carry(d, await coil(d), await room(d, 2.4, 2.9), await room(d, 0, 2.9), await cat(d))
        await d.wait(4000)
        await carry(d, await coil(d), await room(d, 2.4, 2.9), await room(d, -1.6, 2.9), await baby(d))
        await d.wait(4000)
        await carry(d, await coil(d), await gran(d))
        await d.wait(5000)
      },
    },
    {
      name: 'the-room-dark',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]], blanket: [1, 4], cushions: [0, 0, -1], lights: [2, 3, 8, 9] })
        await tap(d, await wallSwitch(d), 6000)
        // A new hole in the dark, and a cat that comes to it.
        await tap(d, await onFace(d, BUILT, 3, 70, 30), 5000)
        await tap(d, await wallSwitch(d), 1200)
        await from(d, { dark: true, boxes: { 0: FIRST[0], 3: { x: 135, on: RUG } } })
        // A box with no hole comes down as a black block; a cushion goes in behind a hole.
        const lid = await room(d, 1.35, kindOf(3).h + FLAP / 2, FRONT_Z - kindOf(3).d + 0.03)
        await carry(d, lid, [lid[0] - 0.01, lid[1] - 0.04])
        await d.wait(1200)
        await from(d, withHole(20, 40, 70, 90, { dark: true }))
        await carry(d, await cushion(d, 0), await onFace(d, FIRST, 0, 120, 60))
        await d.wait(1500)
      },
    },
    {
      name: 'taking-apart',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]], blanket: [1, 4], cushions: [0, 0, -1], lights: [2, 3, 8, 9] })
        // A tap on the loose tape end only pinches it. Each pull takes a strip and the highest box, until nothing is taped.
        await tap(d, await tab(d, 1.85), 800)
        for (let pulls = 0; pulls < 3; pulls++) {
          const end = await tab(d, 1.85)
          await carry(d, end, [end[0] + 0.06, end[1] - 0.01])
          await d.wait(3000)
        }
        await from(d)
        await carry(d, await flap(d, FIRST, 3), await room(d, 1.6, 1.6), await heap(d))
        await d.wait(1800)
      },
    },
    {
      // The pull takes the box the cat looks out of: the cat is over its lid and away before the box is folded.
      name: 'someone-at-a-box-that-a-pull-takes',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]], cat: { at: 'look', box: 1, cell: 45 * 120 + 55 }, baby: 0 })
        await d.wait(1000)
        for (let pulls = 0; pulls < 2; pulls++) {
          const end = await tab(d, 1.85)
          await carry(d, end, [end[0] + 0.06, end[1] - 0.01])
          await d.wait(3500)
        }
      },
    },
    { name: 'the-scissors-snip-the-air', run: async (d) => { await from(d); await tap(d, await room(d, -0.9, 2.9), 3000) } },
    {
      // Each cushion is let go on the opening. The second is let go where the first shows and goes in beside it; the third, where a cushion shows in a full box, is fired out.
      name: 'a-cushion-let-go-on-an-opening-that-shows-a-cushion',
      run: async (d) => {
        await from(d, withHole(40, 20, 160, 70))
        await carry(d, await cushion(d, 0), await onFace(d, FIRST, 0, 100, 45))
        await d.wait(1200)
        await carry(d, await cushion(d, 1), await onFace(d, FIRST, 0, 53, 40))
        await d.wait(1200)
        await carry(d, await cushion(d, 2), await onFace(d, FIRST, 0, 60, 40))
        await d.wait(2500)
      },
    },
    {
      // A tap within reach of a line that waits pokes a peep-hole and the line still waits; a drag from there takes the line up, and it closes.
      name: 'a-tap-beside-a-waiting-line',
      run: async (d) => {
        await from(d)
        await d.press(await onFace(d, FIRST, 0, 30, 30))
        await d.move(await onFace(d, FIRST, 0, 70, 30), 350)
        await d.move(await onFace(d, FIRST, 0, 70, 70), 350)
        await d.release()
        await d.wait(2500)
        await tap(d, await onFace(d, FIRST, 0, 78, 74), 5000)
        await d.press(await onFace(d, FIRST, 0, 66, 76))
        await d.move(await onFace(d, FIRST, 0, 30, 70), 350)
        await d.move(await onFace(d, FIRST, 0, 31, 32), 350)
        await d.release()
        await d.wait(6000)
      },
    },
    {
      // A line waits on the small box that stands on the big one. Let go half off, the box tips: the blades run the line shut where the box hangs, its piece falls, and the box goes over in three knocks.
      name: 'a-box-tipping-with-a-line-waiting',
      run: async (d) => {
        const stacked = { 0: FIRST[0], 3: { x: -35, on: 0 } }
        await from(d, { boxes: stacked, line: { box: 3, path: [20, 20, 60, 20, 60, 50, 24, 50] } })
        await d.wait(1000)
        // Its lid is taken to the right of where the cat sits on it.
        const high = kindOf(0).h + kindOf(3).h + FLAP / 2, back = FRONT_Z - kindOf(3).d + 0.03
        await carry(d, await room(d, -0.02, high, back), await room(d, 1.35, high, back))
        await d.wait(4000)
      },
    },
    {
      // A line waits on the small box that stands on the big one. Dragged back onto the heap, the box hangs there while the cat gets off it and the blades run its line shut, its piece falls, and only then is it folded. And a pull of the tape end takes a box with a line waiting: the line is shut where the box stands before the box goes.
      name: 'a-waiting-line-shut-before-its-box-is-folded-onto-the-heap-and-before-a-pull-takes-it',
      run: async (d) => {
        const stacked = { 0: FIRST[0], 3: { x: -35, on: 0 } }, line = { box: 3, path: [20, 20, 60, 20, 60, 50, 24, 50] }
        await from(d, { boxes: stacked, line })
        await d.wait(1000)
        const high = kindOf(0).h + kindOf(3).h + FLAP / 2, back = FRONT_Z - kindOf(3).d + 0.03
        await carry(d, await room(d, -0.02, high, back), await room(d, 1.6, 1.6), await heap(d))
        await d.wait(3500)
        await from(d, { boxes: stacked, tapes: [[3, 0]], line })
        await d.wait(1000)
        const end = await tab(d, 0.75)
        await carry(d, end, [end[0] + 0.06, end[1] - 0.01])
        await d.wait(4500)
      },
    },
    {
      // Let go along the seam under a stacked box, well off its middle, the strip holds it; and low down on the seam between two boxes side by side.
      name: 'tape-on-a-stacked-seam',
      run: async (d) => {
        const stacked = { 0: FIRST[0], 3: { x: -35, on: 0 } }
        await from(d, { boxes: stacked })
        await carry(d, await roll(d), await room(d, 0.1, kindOf(0).h + 0.12))
        await d.wait(1500)
        // The two now move as one: taken by the lid of the upper one, to the right of where the cat sits, both are carried.
        const lid = await room(d, -0.02, kindOf(0).h + kindOf(3).h + FLAP / 2, FRONT_Z - kindOf(3).d + 0.03)
        await carry(d, lid, [lid[0] + 0.04, lid[1] - 0.03])
        await d.wait(1500)
        await from(d, { boxes: FLUSH })
        await carry(d, await roll(d), await room(d, 0.9, 0.08))
        await d.wait(1500)
      },
    },
    {
      // A second finger lands while the first is cutting, and again while it carries: it is answered where it lands and takes nothing from the first.
      name: 'a-second-finger-while-one-cuts-and-while-one-carries',
      run: async (d) => {
        await from(d)
        await d.press(await onFace(d, FIRST, 0, 30, 30))
        await d.move(await onFace(d, FIRST, 0, 70, 30), 350)
        await secondFinger(d, await onFace(d, FIRST, 3, 40, 30))
        await secondFinger(d, await room(d, -0.9, 2.9))
        await secondFinger(d, await cat(d))
        await d.move(await onFace(d, FIRST, 0, 70, 70), 350)
        await d.move(await onFace(d, FIRST, 0, 30, 70), 350)
        await d.move(await onFace(d, FIRST, 0, 31, 32), 350)
        await d.release()
        await d.wait(5000)
        const lid = await flap(d, FIRST, 3)
        await d.press(lid)
        await d.move([lid[0], lid[1] - 0.12], 450)
        await secondFinger(d, await cushion(d, 1))
        await secondFinger(d, await baby(d))
        await secondFinger(d, await onFace(d, FIRST, 0, 120, 60))
        await d.move([lid[0] - 0.2, lid[1] - 0.12], 450)
        await d.release()
        await d.wait(2500)
      },
    },
    {
      // The cat on a lid the blanket lies over sits on the cloth through every idle it has, washing among them; touched, it goes to a hole and comes back up.
      name: 'the-cat-on-a-roof',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]], blanket: [1, 4] })
        await d.wait(24000)
        await tap(d, await cat(d), 5000)
        await tap(d, await cat(d), 4000)
        // The same on a low roof, where it sits up.
        await from(d, { boxes: FLUSH, blanket: [0, 3] })
        await d.wait(16000)
      },
    },
    {
      // The cat looks out of a hole of a box with two cushions in it: they lie behind where its head is. One is taken out past it and the cat draws back; a new small hole brings it to that box again.
      name: 'the-cat-at-a-hole-of-a-box-with-cushions-in-it',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]], cushions: [0, 0, -1], cat: { at: 'look', box: 0, cell: 60 * 176 + 40 } })
        await d.wait(4000)
        await carry(d, await onFace(d, BUILT, 0, 68, 44), await room(d, 0.9, 0.5, FRONT_Z + 0.4), await room(d, 0.9, 0.1, FRONT_Z + 0.4))
        await d.wait(3000)
        await cutSquare(d, BUILT, 0, 20, 108, 60, 124)
        await d.wait(6000)
        await tap(d, await cat(d), 3000)
        // And a first hole cut in a small box with a cushion in it, as a child would cut it.
        const small = { 0: FIRST[0], 3: { ...FIRST[3], holes: [[70, 40, 80, 50]] } }
        await from(d, { boxes: small, cushions: [3, 3, -1], cat: { at: 'rug', box: 0, cell: 0 } })
        await cutSquare(d, small, 3, 30, 14, 64, 48)
        await d.wait(6000)
        await tap(d, await cat(d), 3000)
      },
    },
    {
      // The baby crawls along the front of a built fort and back, its block riding beside it, past the scissors where they lie.
      name: 'the-baby-crawls-past-the-scissors-with-its-block',
      run: async (d) => {
        await from(d, { boxes: BUILT, tapes: [[0, 3], [1, 0]] })
        await tap(d, await baby(d), 9000)
        await tap(d, await baby(d), 7000)
      },
    },
  ],
} satisfies GameAudit
