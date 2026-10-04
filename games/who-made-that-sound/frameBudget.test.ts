import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AT_REST, CUT_SIZES, outlines } from './figures'
import { moveToShow } from './guide'
import type { Guidance } from './guidance'
import { type Clutch, isSound } from './layout'
import { FORMS } from './places'
import { direct } from './plays'
import { Show } from './show'
import { GameView } from './view'
import { KINDS } from './voices'
import { type Action, type Resident, type World, act, freshWorld } from './world'

// The frame budget, counted and never timed, so that it holds on a busy runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// A frame of this game is one cached layer and then cut pieces of tissue laid
// down one by one, so its cost is how many pieces it lays, and whether it had
// to paint or cut anything first. The view runs here on a stand-in for the
// canvas that draws nothing and counts everything.

// --- The budgets -------------------------------------------------------------

/** The surface the game is measured on: a tablet's, at the pixel ratio the jam caps at. */
const WIDTH = 1180, HEIGHT = 820, RATIO = 2
/**
 * The most pieces one frame may lay. The heaviest page standing still lays 173: four grown ones in the row, an
 * egg on the stone, the next egg at the edge and four families on the hill, with the glow and the ghost hand.
 * The heaviest moment of a play lays 179: the first frames of a reunion on a full hill, with the shell in pieces,
 * the two who meet, and the family that makes way still there. The budget is that and a tenth more.
 */
const PIECES = 200
/** The view cuts one kind at one size after each frame until all are cut (`Figures.warm`): six kinds at three sizes. */
const WARM_FRAMES = KINDS.length * CUT_SIZES.length
/**
 * The most canvases one frame of the warm-up may make: one for each piece of the kind it cuts, 14 for the kinds
 * with the most, and the first time a kind is cut one for each sheet of tissue painted for it, 4 at the most.
 */
const WARM_CANVASES = 18
/** A piece that covers this share of the surface is a stamp of a whole layer. A frame has one: the page. */
const STAMP = 0.5
/** No piece other than the page covers more of the surface than this. The biggest measured is 0.093 of it; the glow under the one who asks is 0.086. */
const BIGGEST = 0.12
/** A play is drawn frame by frame for this long: all of a reunion, and the start of anything longer. */
const PLAYED_SECONDS = 9
const FRAME = 1 / 60
/** The idle ladder at its fullest: the glow at full strength and the ghost hand in the middle of a tap. */
const GUIDE: Guidance = { glow: 1, demo: 0.4, demoIndex: 0 }

// --- A stand-in for the canvas -------------------------------------------------

type Canvas = { width: number; height: number; getContext(kind: string): unknown }
/** One piece laid on a canvas: which canvas, from which, and the share of that canvas its bounding box covers. */
type Laid = { on: Canvas; from: Canvas; share: number; plain: boolean }

/**
 * The smallest DOM the view runs on. A canvas is a size and a context; a context swallows every call and every
 * property the painting code makes, keeps its transform well enough to say where a piece lands, and counts what
 * costs something: canvases made, shapes filled, stroked and clipped, pixels read, pieces laid.
 */
function standIn() {
  const tally = { made: 0, painted: 0, laid: [] as Laid[] }
  const nothing = () => {}
  function context(canvas: Canvas) {
    let m = [1, 0, 0, 1, 0, 0]
    const stack: number[][] = []
    const by = (a: number, b: number, c: number, d: number, e: number, f: number) => {
      m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]
    }
    const paint = () => { tally.painted++ }
    const real: Record<string, unknown> = {
      canvas,
      save() { stack.push(m) },
      restore() { m = stack.pop() ?? m },
      setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { m = [a, b, c, d, e, f] },
      resetTransform() { m = [1, 0, 0, 1, 0, 0] },
      transform: by,
      translate(x: number, y: number) { by(1, 0, 0, 1, x, y) },
      scale(x: number, y: number) { by(x, 0, 0, y, 0, 0) },
      rotate(angle: number) { by(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0) },
      fill: paint, stroke: paint, clip: paint, fillRect: paint,
      getImageData(_x: number, _y: number, w: number, h: number) { tally.painted++; return { width: w, height: h, data: new Uint8ClampedArray(4) } },
      drawImage(from: Canvas, ...rest: number[]) {
        // The three ways a piece is laid: where it is, where and how big, or a part of it where and how big.
        const [x, y, w, h] = rest.length >= 8 ? rest.slice(4) : rest.length >= 4 ? rest : [rest[0], rest[1], from.width, from.height]
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
        for (const [px, py] of [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]) {
          const ax = m[0] * px + m[2] * py + m[4], ay = m[1] * px + m[3] * py + m[5]
          left = Math.min(left, ax); right = Math.max(right, ax); top = Math.min(top, ay); bottom = Math.max(bottom, ay)
        }
        const across = Math.max(0, Math.min(canvas.width, right) - Math.max(0, left)), down = Math.max(0, Math.min(canvas.height, bottom) - Math.max(0, top))
        const plain = rest.length === 2 && x === 0 && y === 0 && m.every((value, i) => value === [1, 0, 0, 1, 0, 0][i])
        tally.laid.push({ on: canvas, from, share: (across * down) / (canvas.width * canvas.height), plain })
      },
    }
    // Anything else the painting code calls does nothing, cheaply; anything it sets is kept and never read by the game.
    return new Proxy(real, { get: (target, name) => (name in target ? target[name as string] : nothing) })
  }
  const canvas = (width = 300, height = 150): Canvas => {
    let ctx: unknown = null
    const made: Canvas = { width, height, getContext: (kind) => (kind === '2d' ? (ctx ??= context(made)) : null) }
    return made
  }
  const document = { createElement(tag: string) { if (tag !== 'canvas') throw new Error(`the game made a ${tag}`); tally.made++; return canvas() } }
  return { tally, canvas, document }
}

const dom = standIn()
const page = globalThis as { document?: unknown }
let had: unknown
beforeAll(() => { had = page.document; page.document = dom.document })
afterAll(() => { if (had === undefined) delete page.document; else page.document = had })

// --- What a frame cost ---------------------------------------------------------

type Stage = { surface: Canvas; view: GameView }
/** A surface and its view. `warm` draws the bare page until every figure is cut, as the first moments of a visit do. */
function stage(warm = true): Stage {
  const surface = dom.canvas(WIDTH * RATIO, HEIGHT * RATIO), on = { surface, view: new GameView(surface as unknown as HTMLCanvasElement, 7) }
  if (warm) expect(warmUp(on).length).toBeLessThanOrEqual(WARM_FRAMES + 1)
  return on
}

type Cost = {
  /** What `draw` says it laid, and what landed on the surface. */
  pieces: number; laid: number
  /** Pieces that cover a layer's share of the surface, whether the first of them is the cached page laid plainly, and the biggest piece after those. */
  stamps: number; page: boolean; biggest: number
  /** Canvases made, shapes painted or cut, and pieces laid on any canvas but the surface: the work of painting and cutting. */
  made: number; painted: number; cut: number
}

function frame({ surface, view }: Stage, show: Show | null, key: string | null, guide: Guidance | null = GUIDE): Cost {
  const { tally } = dom, made = tally.made, painted = tally.painted
  tally.laid = []
  const pieces = view.draw(WIDTH, HEIGHT, RATIO, show, guide, key)
  const mine = tally.laid.filter((one) => one.on === surface), stamps = mine.filter((one) => one.share >= STAMP)
  return {
    pieces, laid: mine.length, stamps: stamps.length,
    page: mine.length > 0 && mine[0].plain && mine[0].share === 1 && mine[0].from.width === surface.width && mine[0].from.height === surface.height,
    biggest: Math.max(0, ...mine.filter((one) => one.share < STAMP).map((one) => one.share)),
    made: tally.made - made, painted: tally.painted - painted, cut: tally.laid.length - mine.length,
  }
}

/** Draws the bare page until the view says it has nothing left to cut, and gives what each of those frames cost. */
function warmUp(on: Stage): Cost[] {
  const costs: Cost[] = []
  while (on.view.warming && costs.length < WARM_FRAMES * 2) costs.push(frame(on, null, null))
  return costs
}

/** The thing the idle ladder would point at, so the glow and the ghost hand are in the frame. */
function wanted(world: World, show: Show): string | null {
  const move = moveToShow(world), key = move ? (move.on === 'slot' ? `slot:${move.slot}` : move.on) : null
  return key !== null && show.picture.things.some((thing) => thing.key === key) ? key : show.picture.things.find((thing) => !show.hidden(thing.key))?.key ?? null
}

// --- The heaviest states -------------------------------------------------------

/** The four kinds with the most pieces, as families: two figures in each place of the hill. */
const FAMILIES: Resident[] = (['brrl', 'wheep', 'dooo', 'hoom'] as const).map((kind, place) => ({ kind, as: 'family', place }))
const TWINS: Resident[] = (['wheep', 'dooo', 'pip', 'tok'] as const).map((kind, place) => ({ kind, as: 'twins', place }))
const heard = (count: number) => Array.from({ length: count }, () => 'heard' as const)

function during(cycle: Clutch, more: Partial<World>): World {
  expect(isSound(cycle), 'a clutch the game could have laid out and played').toBe(true)
  return { ...freshWorld(null), position: cycle.place, shown: [...FORMS], finished: false, next: null, cycle, hill: FAMILIES, ...more }
}

const STANDING: Record<string, () => World> = {
  // The basket has been tipped in, so the row is full; all four have been heard; one asks and the next one waits.
  'four heard eggs, a grown one asking, the next at the edge, four families': () =>
    during({ form: 'seek', place: 'three-eggs', kinds: ['hoom', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'hoom', wrong: 0 }, {}),
  'four grown ones in the row, an egg asking, the next egg at the edge, four families': () =>
    during({ form: 'who', place: 'who-is-inside', kinds: ['hoom', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'hoom', wrong: 0 }, {}),
  'three heard leaf piles, the basket, a grown one asking, the next at the edge, four families': () =>
    during({ form: 'seek', place: 'leaf-piles', kinds: ['hoom', 'brrl', 'wheep'], slots: heard(3), queue: ['brrl', 'wheep'], asker: 'hoom', wrong: 0 }, { extra: 'dooo' }),
  'three heard eggs of four, a little one asking, the basket, four pairs of twins': () =>
    during({ form: 'alike', place: 'two-alike', kinds: ['hoom', 'brrl', 'hoom', 'brrl'], slots: ['heard', 'done', 'heard', 'heard'], queue: [], asker: 'brrl', wrong: 0 }, { extra: 'dooo', hill: TWINS }),
  'between cycles: four families, the basket, and three grown ones round the next nest at the edge': () => ({
    ...during({ form: 'seek', place: 'near-in-leaves', kinds: ['hoom', 'brrl', 'wheep'], slots: ['done', 'done', 'done'], queue: [], asker: null, wrong: 0 }, { extra: 'pip' }),
    position: 'who-is-inside', finished: true, next: { form: 'who', place: 'who-is-inside', kinds: ['hoom', 'brrl', 'wheep'], slots: ['fresh', 'fresh', 'fresh'], queue: ['brrl', 'hoom', 'wheep'], asker: null, wrong: 0 },
  }),
}

const three = FAMILIES.slice(0, 3)
/** A world and the one tap that sets a play going in it. */
const PLAYS: Record<string, () => { before: World; action: Action; happens: string[] }> = {
  'a reunion with room on the hill': () => ({
    before: during({ form: 'seek', place: 'three-eggs', kinds: ['hoom', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'hoom', wrong: 0 }, { hill: three }),
    action: { type: 'slot', slot: 0 }, happens: ['meets', 'settles'],
  }),
  'a reunion on a full hill, where one makes way': () => ({
    before: during({ form: 'seek', place: 'three-eggs', kinds: ['pip', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'pip', wrong: 0 }, {}),
    action: { type: 'slot', slot: 0 }, happens: ['meets', 'leaves', 'settles'],
  }),
  'a meeting that does not match': () => ({
    before: during({ form: 'seek', place: 'three-eggs', kinds: ['hoom', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'hoom', wrong: 0 }, { hill: three.slice(0, 2) }),
    action: { type: 'slot', slot: 3 }, happens: ['meets', 'settles'],
  }),
  'a knock on the right egg': () => ({
    before: during({ form: 'who', place: 'who-is-inside', kinds: ['hoom', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'hoom', wrong: 0 }, { hill: three }),
    action: { type: 'slot', slot: 0 }, happens: ['meets', 'settles'],
  }),
  'a knock on the right egg on a full hill, where one makes way': () => ({
    before: during({ form: 'who', place: 'who-is-inside', kinds: ['pip', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'pip', wrong: 0 }, {}),
    action: { type: 'slot', slot: 0 }, happens: ['meets', 'leaves', 'settles'],
  }),
  'a knock on the wrong egg': () => ({
    before: during({ form: 'who', place: 'who-is-inside', kinds: ['hoom', 'brrl', 'wheep', 'dooo'], slots: heard(4), queue: ['brrl', 'wheep', 'dooo'], asker: 'hoom', wrong: 0 }, {}),
    action: { type: 'slot', slot: 1 }, happens: ['meets'],
  }),
  'the last reunion and the choir': () => ({
    before: during({ form: 'seek', place: 'three-eggs', kinds: ['hoom', 'brrl', 'wheep'], slots: ['heard', 'done', 'done'], queue: [], asker: 'hoom', wrong: 0 }, { hill: three }),
    action: { type: 'slot', slot: 0 }, happens: ['meets', 'settles', 'ends'],
  }),
  'a showing, a clutch coming in and the first one asking': () => {
    // Whoever shows is never of a kind in the clutch, so with those three on the hill nobody has to make way for it.
    const fresh = freshWorld(null, undefined, 'who-is-inside')
    return { before: { ...fresh, hill: fresh.next!.kinds.map((kind, place) => ({ kind, as: 'family' as const, place })) }, action: { type: 'edge' }, happens: ['arrives', 'shows', 'settles', 'asks'] }
  },
  'an egg tipped in from the basket': () => ({
    before: during({ form: 'who', place: 'who-is-inside', kinds: ['hoom', 'brrl', 'wheep'], slots: heard(3), queue: ['brrl', 'wheep'], asker: 'hoom', wrong: 0 }, { extra: 'dooo' }),
    action: { type: 'basket' }, happens: ['tips'],
  }),
}

/** A show in the middle of a play, set going as the game does it: the world has changed, the picture is read again, the play starts. */
function playing({ view }: Stage, name: string): { show: Show; world: World; seconds: number } {
  const { before, action, happens } = PLAYS[name](), step = act(before, action)
  // The heavy moment is the one meant: the tap made exactly this happen.
  expect(step.happened.map((one) => one.type), name).toEqual(happens)
  const play = direct(step.happened, action, before, step.world, view.view, 0)
  expect(play, name).not.toBeNull()
  const show = new Show(before, view.view)
  show.retarget(step.world, view.view)
  show.start(play!, () => {})
  return { show, world: step.world, seconds: play!.seconds }
}

// --- The tests -----------------------------------------------------------------

describe('a frame', () => {
  it('of the bare page is one stamp of the cached layer and nothing else', () => {
    const on = stage(false), first = frame(on, null, null), second = frame(on, null, null)
    // The first frame at a size paints the page and cuts the pieces that are not creatures.
    expect(first.made).toBeGreaterThan(10)
    expect(first.painted).toBeGreaterThan(1000)
    for (const cost of [first, second]) expect([cost.pieces, cost.laid, cost.stamps, cost.page]).toEqual([1, 1, 1, true])
  })

  it('cuts the creatures a kind and a size a frame from the first on, and is done within eighteen frames', () => {
    const on = stage(false), warm = warmUp(on)
    expect(on.view.warming).toBe(false)
    // Every set is cut by the eighteenth frame; the view may take one frame more to find nothing left.
    expect(warm.length).toBeLessThanOrEqual(WARM_FRAMES + 1)
    expect(warm.slice(WARM_FRAMES).every((cost) => cost.made === 0 && cost.painted === 0 && cost.cut === 0)).toBe(true)
    // After the first, which also paints the page, no frame of the warm-up cuts more than one kind's pieces.
    expect(Math.max(...warm.slice(1).map((cost) => cost.made))).toBeLessThanOrEqual(WARM_CANVASES)
    expect(warm.every((cost) => cost.pieces === 1 && cost.stamps === 1 && cost.page)).toBe(true)
    // And then it is over: nothing more is made, whatever is drawn.
    const after = frame(on, null, null)
    expect([after.made, after.painted, after.cut]).toEqual([0, 0, 0])
  })

  it('counts its pieces truly: what the view says it laid is what landed on the surface', () => {
    const on = stage()
    for (const [name, world] of Object.entries(STANDING)) {
      const show = new Show(world(), on.view.view), cost = frame(on, show, wanted(world(), show))
      expect(cost.pieces, name).toBe(cost.laid)
      expect(cost.pieces, name).toBeGreaterThan(40)
    }
  })

  it('leaves the spring on the head of the springy kind out under a rider: a family of it is two pieces fewer than two of it', () => {
    const on = stage()
    const laid = (hill: Resident[]) => { const world: World = { ...freshWorld(null), hill }; return frame(on, new Show(world, on.view.view), null, null).pieces }
    const nobody = laid([]), parts = (kind: (typeof KINDS)[number]) => outlines(kind, 100, AT_REST).length
    for (const kind of KINDS) {
      // A family is the grown one and its rider; one alone is one figure.
      expect(laid([{ kind, as: 'single', place: 1 }]) - nobody, kind).toBe(parts(kind))
      expect(laid([{ kind, as: 'family', place: 1 }]) - nobody, kind).toBe(2 * parts(kind) - (kind === 'wheep' ? 2 : 0))
      expect(laid([{ kind, as: 'twins', place: 1 }]) - nobody, kind).toBe(2 * parts(kind))
    }
  })

  it('of the heaviest pages standing still stays under the budget, with one stamp', () => {
    const on = stage(), counts: Record<string, number> = {}
    for (const [name, world] of Object.entries(STANDING)) {
      const show = new Show(world(), on.view.view), key = wanted(world(), show)
      const cost = frame(on, show, key), bare = frame(on, show, key, null)
      counts[name] = cost.pieces
      // The glow and the ghost hand are in the count: the idle ladder at its fullest.
      expect(cost.pieces - bare.pieces, name).toBe(2)
      expect(cost.pieces, name).toBeLessThanOrEqual(PIECES)
      expect([cost.stamps, cost.page], name).toEqual([1, true])
      expect(cost.biggest, name).toBeLessThanOrEqual(BIGGEST)
    }
    // The heaviest is the row of grown ones, and it is what the budget was measured on.
    const heaviest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    expect(heaviest[0]).toBe('four grown ones in the row, an egg asking, the next egg at the edge, four families')
    expect(heaviest[1]).toBeGreaterThan(PIECES * 0.75)
  })

  it('of a page standing still paints and cuts nothing, from its very first, and lays the same pieces again', () => {
    const on = stage()
    for (const [name, world] of Object.entries(STANDING)) {
      const show = new Show(world(), on.view.view), key = wanted(world(), show)
      const first = frame(on, show, key), second = frame(on, show, key)
      for (const cost of [first, second]) expect([cost.made, cost.painted, cost.cut], name).toEqual([0, 0, 0])
      expect(second.pieces, name).toBe(first.pieces)
      // And a second later, with everybody at another moment of their idle round.
      for (let i = 0; i < 60; i++) show.step(FRAME)
      const later = frame(on, show, key)
      expect([later.made, later.painted, later.cut], name).toEqual([0, 0, 0])
      expect(later.pieces, name).toBe(first.pieces)
    }
  })
})

describe('a frame in the middle of a play', () => {
  /** Every frame of the first seconds of a play. */
  function played(on: Stage, name: string): Cost[] {
    const { show, world, seconds } = playing(on, name), costs: Cost[] = []
    for (let t = 0; t < Math.min(seconds, PLAYED_SECONDS); t += FRAME) {
      costs.push(frame(on, show, wanted(world, show)))
      show.step(FRAME)
    }
    return costs
  }

  it('stays under the budget, with one stamp, and counts its pieces truly', () => {
    const on = stage(), most: Record<string, number> = {}
    for (const name of Object.keys(PLAYS)) {
      const costs = played(on, name)
      expect(costs.length, name).toBeGreaterThan(50)
      most[name] = Math.max(...costs.map((cost) => cost.pieces))
      expect(most[name], name).toBeLessThanOrEqual(PIECES)
      expect(costs.every((cost) => cost.pieces === cost.laid), name).toBe(true)
      expect(costs.every((cost) => cost.stamps === 1 && cost.page), name).toBe(true)
      expect(Math.max(...costs.map((cost) => cost.biggest)), name).toBeLessThanOrEqual(BIGGEST)
    }
    // The heavy moment happened, and it is the one the budget was measured on: a hide bursting beside a full hill.
    const heaviest = Object.entries(most).sort((a, b) => b[1] - a[1])[0]
    expect(heaviest[0]).toBe('a reunion on a full hill, where one makes way')
    expect(heaviest[1]).toBeGreaterThan(PIECES * 0.75)
  })

  it('paints and cuts nothing, from its very first: whoever walks, grows or shrinks is laid from pieces already cut', () => {
    const on = stage(), wrong: string[] = []
    let resized = 0
    for (const name of Object.keys(PLAYS)) {
      const costs = played(on, name), cutting = costs.filter((cost) => cost.made > 0 || cost.painted > 0 || cost.cut > 0)
      const sum = (of: (cost: Cost) => number) => cutting.reduce((total, cost) => total + of(cost), 0)
      if (cutting.length > 0) wrong.push(`${name}: ${cutting.length} of ${costs.length} frames cut ${sum((cost) => cost.cut)} pieces on ${sum((cost) => cost.made)} new canvases, ${Math.max(...cutting.map((cost) => cost.made))} at the most in one frame`)
      // The heavy moment happened: in most of these plays somebody is sent somewhere at another size.
      const { before, action } = PLAYS[name](), step = act(before, action), play = direct(step.happened, action, before, step.world, on.view.view, 0)!
      if (play.acts.some((one) => one.do === 'go' && play.cast.some((cast) => cast.id === one.who && Math.abs(cast.from.size - one.to.size) > 1))) resized++
    }
    expect(resized).toBeGreaterThanOrEqual(4)
    expect(wrong).toEqual([])
  })

  it('lays the same pieces again when the same moment is drawn twice', () => {
    const on = stage()
    for (const name of Object.keys(PLAYS)) {
      const { show, world } = playing(on, name)
      for (let i = 0; i < 30; i++) show.step(FRAME)
      const key = wanted(world, show), first = frame(on, show, key), second = frame(on, show, key)
      expect(second.pieces, name).toBe(first.pieces)
      expect([second.made, second.painted, second.cut], name).toEqual([0, 0, 0])
    }
  })
})
