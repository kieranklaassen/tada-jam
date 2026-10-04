import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SUPPLY_LANES, boardFor, hourX, trailPoint, type Board } from './board'
import { restGameFrame, type GameFrame, type Part, type SideFrame } from './frame'
import { paintKit, paintTop, rowsRead, stripLayout } from './lookKit'
import { ROD_LENGTH, SITES } from './world'

// A recording stand-in for a 2D context. Every call is counted by name and written to a log; the transform is
// followed through save, restore, translate, rotate and scale, so each numeral is recorded where it lands on the
// surface and how tall it stands there. Nothing is measured from a real font: a digit is six tenths of its size wide.
type Drawn = { text: string; x: number; y: number; size: number; ink: string }
type Recorder = { calls: Map<string, number>; log: string[]; texts: Drawn[]; edges: string[]; fills: Set<string>; bad: number }
const recorder = (): Recorder => ({ calls: new Map(), log: [], texts: [], edges: [], fills: new Set(), bad: 0 })

function fakeContext(into: Recorder): CanvasRenderingContext2D {
  const state: Record<string, unknown> = { font: '10px sans-serif' }
  let m = [1, 0, 0, 1, 0, 0]
  const stack: number[][] = []
  const fontSize = () => Number(/(\d+(?:\.\d+)?)px/.exec(String(state.font))?.[1] ?? 0)
  return new Proxy(state, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        into.calls.set(name, (into.calls.get(name) ?? 0) + 1)
        // A number that is not finite would draw nothing, or throw, in a real context.
        for (const arg of args) if (typeof arg === 'number' && !Number.isFinite(arg)) into.bad++
        into.log.push(`${name}(${args.map((arg) => (typeof arg === 'number' ? arg.toFixed(3) : typeof arg === 'string' ? arg : typeof arg)).join(',')})`)
        const n = args as number[]
        if (name === 'save') stack.push([...m])
        else if (name === 'restore') m = stack.pop() ?? m
        else if (name === 'translate') m = [m[0], m[1], m[2], m[3], m[4] + m[0] * n[0] + m[2] * n[1], m[5] + m[1] * n[0] + m[3] * n[1]]
        else if (name === 'scale') m = [m[0] * n[0], m[1] * n[0], m[2] * n[1], m[3] * n[1], m[4], m[5]]
        else if (name === 'rotate') { const c = Math.cos(n[0]), s = Math.sin(n[0]); m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]] }
        else if (name === 'measureText') return { width: String(args[0]).length * fontSize() * 0.6 }
        else if (name === 'fillText') into.texts.push({ text: String(args[0]), x: m[0] * n[1] + m[2] * n[2] + m[4], y: m[1] * n[1] + m[3] * n[2] + m[5], size: fontSize() * Math.hypot(m[2], m[3]), ink: String(state.fillStyle) })
        else if (name === 'fill') into.fills.add(String(state.fillStyle))
        else if (name === 'strokeText') into.edges.push(String(args[0]))
        return undefined
      }
    },
    set(target, name, value) { if (typeof name === 'string') target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
}

const W = 1180, H = 820
const P = (num: number, den = 1): Part => ({ num, den })
const stamps = (per: number, count: number, side: SideFrame = 'single', den = 1) => Array.from({ length: count }, (_, k) => ({ side, hours: P(k + 1), pieces: P(per * (k + 1), den) }))

function paint(board: Board, frame: GameFrame, night = false) {
  const into = recorder(), ctx = fakeContext(into)
  const kit = paintKit(ctx, board, frame, { night }), top = paintTop(ctx, board, frame)
  return { into, kit, top }
}

/** Everything laid out at once at the fullest site: full rods with a heap, a night run to its end with a pin for each user, three users' strips with halves, cards on every side, a lantern in the hand, a full sled refusing, the longest trail, the glow and the hand. */
function busy(board: Board): GameFrame {
  const frame = restGameFrame(board)
  frame.rows.logs = { ...frame.rows.logs, length: 60, pop: 0.6, waveAt: 31.4, wave: 0.8, rattle: 0.7, heap: 12, held: true, tapped: 12.3, tap: 0.4, flying: [{ from: 60, t: 0.2 }, { from: 59, t: 0.5 }, { from: 58, t: 0.8 }] }
  frame.rows.oil = { ...frame.rows.oil, length: 11.4, waveAt: 3.5, wave: 0.6, slosh: 0.8, rattle: 0.4, heap: 3, tapped: 2.2, tap: 0.3, flying: [{ from: 8, t: 0.4 }] }
  frame.rows.water = { ...frame.rows.water, length: 10, slosh: -0.6, held: true, heap: 2, tapped: 9.5, tap: 0.7 }
  frame.night = { hour: board.hours, film: 1, held: true, hoot: 0, morning: false }
  frame.blaze = { setting: board.site.fire.length - 1, knob: 0.4, lit: true, reach: board.reach[board.reach.length - 1], flare: 0 }
  frame.ash = {
    fire: { amount: { pieces: 5, hours: 1 }, until: board.hours - 0.3 },
    lantern: { amount: { pieces: 1, hours: 2 }, until: board.hours },
    kettle: [0, 2, 4, 6, 8, 10].map((hour) => ({ hour, cups: hour < 8 ? 5 : 2, wanted: 5 })),
  }
  frame.rulerPins = { fire: { hour: board.hours - 0.3, drop: 1 }, lantern: { hour: 9, drop: 0.5 }, kettle: { hour: 8, drop: 1 } }
  frame.strips.fire = [
    { card: 0, amount: { pieces: 2, hours: 1 }, current: false, stamps: stamps(2, board.hours) },
    { card: 2, amount: { pieces: 5, hours: 1 }, current: true, stamps: stamps(5, board.hours) },
  ]
  frame.strips.lantern = [{ card: 1, amount: { pieces: 1, hours: 2 }, current: true, stamps: stamps(1, board.hours, 'halved', 2) }]
  frame.strips.kettle = [{ card: 0, amount: { pieces: 5, hours: 2 }, current: true, stamps: stamps(5, board.hours, 'halved', 2) }]
  if (frame.cards.fire) frame.cards.fire.side = 'doubled'
  if (frame.cards.lantern) { frame.cards.lantern.side = 'halved'; frame.cards.lantern.flip = 0.7 }
  if (frame.cards.kettle) { frame.cards.kettle.side = 'halved'; frame.cards.kettle.held = true }
  frame.lanterns = frame.lanterns.map((lamp, i) => (i === 0 ? { ...lamp, lit: true, wick: 1, click: 0.6, reach: board.lampHigh } : { ...lamp, x: 700, y: 380, held: true, lit: true }))
  if (frame.sled) frame.sled = { load: [{ supply: 'logs', places: 30 }, { supply: 'oil', places: 14 }, { supply: 'water', places: 12 }], refuse: 0.5, strapped: true }
  frame.trail = Array.from({ length: 24 }, (_, k) => trailPoint(board, k * 7))
  frame.tin = 0.6; frame.needle = 0.9; frame.glow = 0.7
  frame.halos = SUPPLY_LANES.map((_, i) => ({ x: board.pile, y: board.lanes[i] - 12 * board.u, r: 42 * board.u }))
  frame.hand = { x: board.pile, y: board.lanes[0], press: 0.6, opacity: 0.8 }
  frame.carried = { thing: 'can', x: 500, y: 300 }
  return frame
}

/** The numerals that landed in a band of the surface, left to right. */
const within = (texts: Drawn[], x0: number, x1: number, y0: number, y1: number) => texts.filter((t) => t.x >= x0 && t.x <= x1 && t.y >= y0 && t.y <= y1).sort((a, b) => a.x - b.x)
/** The numerals under a rod's lane, between the pile end of the rod and its point. */
const underRod = (board: Board, texts: Drawn[], lane: number) => within(texts, board.rodX, board.rodX + board.rodLen + 1, board.lanes[lane] + 7 * board.u, board.lanes[lane] + 34 * board.u)
/** The numerals on the face of the ruler. */
const onRuler = (board: Board, texts: Drawn[]) => within(texts, board.ruler.x, hourX(board, board.hours) + 1, board.ruler.y - board.ruler.thick, board.ruler.y + board.ruler.thick)

describe('the kit', () => {
  it('paints a frame at rest and a busy frame at two sites, with every number finite and every save restored', () => {
    for (const board of [boardFor(W, H, SITES.meadow[0], 0), boardFor(W, H, SITES.summit[0], 2), boardFor(1024, 768, SITES.tarn[0], 1)]) {
      for (const frame of [restGameFrame(board), busy(board)]) for (const night of [false, true]) {
        const { into, kit } = paint(board, frame, night)
        expect(kit).toBeGreaterThan(10)
        expect(into.bad).toBe(0)
        expect(into.calls.get('save')).toBe(into.calls.get('restore'))
      }
    }
  })

  it('draws no text but numerals, and makes no text call of its own', () => {
    const board = boardFor(W, H, SITES.summit[0], 2)
    const { into } = paint(board, busy(board))
    expect(into.texts.length).toBeGreaterThan(60)
    // Every string that reached the surface is digits only: a whole number, or one of the two numbers of a fraction.
    for (const drawn of into.texts) expect(drawn.text).toMatch(/^\d+$/)
    for (const edge of into.edges) expect(edge).toMatch(/^\d+$/)
    // And every one came through symbols.ts: the view itself has no text call in it, and builds no string to draw.
    const source = readFileSync(fileURLToPath(new URL('./lookKit.ts', import.meta.url)), 'utf8')
    for (const call of ['fillText', 'strokeText', 'measureText', 'String(', 'toFixed', '.font']) expect(source.includes(call)).toBe(false)
    expect(source).toMatch(/from '\.\/symbols'/)
    // The view holds no state and reads no clock.
    for (const call of ['Math.random', 'Date.now', 'createElement', 'OffscreenCanvas']) expect(source.includes(call)).toBe(false)
  })

  it('draws only the rods the site has, each counted in fives from the pile', () => {
    const meadow = boardFor(W, H, SITES.meadow[0], 0)
    expect(meadow.rods).toEqual(['logs'])
    const one = paint(meadow, restGameFrame(meadow)).into
    expect(underRod(meadow, one.texts, 0).map((t) => t.text)).toEqual(['5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60'])
    expect(underRod(meadow, one.texts, 1)).toEqual([])
    expect(underRod(meadow, one.texts, 2)).toEqual([])
    // Each numeral lies under its own mark of the rod.
    underRod(meadow, one.texts, 0).forEach((t, i) => expect(t.x).toBeCloseTo(meadow.rodX + ((i + 1) * 5 * meadow.rodLen) / ROD_LENGTH.logs, 3))
    const summit = boardFor(W, H, SITES.summit[0], 0)
    const three = paint(summit, restGameFrame(summit)).into
    expect(underRod(summit, three.texts, 0).length).toBe(12)
    // The water rod's counts stand above its row, at the top edge of its lane, where the cursor's tab never stands:
    // the cups of a can, once, over the first can, and then the cans in fives. Nothing is written under the water rod.
    expect(underRod(summit, three.texts, 2)).toEqual([])
    const gap = within(three.texts, summit.rodX, summit.rodX + summit.rodLen + 1, summit.lanes[1] + 7 * summit.u, summit.lanes[2] - 30 * summit.u)
    const can = summit.rodLen / ROD_LENGTH.water, flask = summit.rodLen / ROD_LENGTH.oil
    const over = (x: number) => gap.filter((t) => Math.abs(t.x - summit.rodX - x) < 0.01).map((t) => t.text)
    expect(gap.length).toBe(5)
    expect([over(can / 2), over(5 * can), over(10 * can)]).toEqual([['6'], ['5'], ['10']])
    expect([over(5 * flask), over(10 * flask)]).toEqual([['5'], ['10']])
    // One rod is one tray, one rod and its counts; three rods are three of each.
    expect(paint(summit, restGameFrame(summit)).kit - paint(meadow, restGameFrame(meadow)).kit).toBeGreaterThanOrEqual(6)
  })

  it('counts a row at its end, as the whole number its length rounds to', () => {
    const board = boardFor(W, H, SITES.summit[0], 0), frame = restGameFrame(board)
    const none = paint(board, frame).into.texts.length
    frame.rows.logs.length = 17; frame.rows.oil.length = 2.6; frame.rows.water.length = 0.2
    const { into } = paint(board, frame)
    // The water's sliver rounds to none, and nothing names it.
    expect(into.texts.length).toBe(none + 2)
    const atRow = (lane: number) => within(into.texts, board.rodX, board.flap.top, board.lanes[lane] - 30 * board.u, board.lanes[lane] - 8 * board.u)
    expect(atRow(0).map((t) => t.text)).toEqual(['17'])
    expect(atRow(1).map((t) => t.text)).toEqual(['3'])
    expect(atRow(0)[0].x).toBeGreaterThan(board.rodX + (17 * board.rodLen) / ROD_LENGTH.logs)
  })

  it('lets a cup of water hop out of a tapped can and back, and no cup out of a flask', () => {
    const board = boardFor(W, H, SITES.summit[0], 0), frame = restGameFrame(board)
    frame.rows.water.length = 3; frame.rows.oil.length = 3
    const still = paint(board, frame).into
    frame.rows.water.tapped = 1; frame.rows.water.tap = 0.4
    const hopping = paint(board, frame).into
    // The swelling can, the cup turned in the air above the row, and its drops.
    expect(hopping.log.length).toBeGreaterThan(still.log.length + 12)
    expect((hopping.calls.get('rotate') ?? 0) - (still.calls.get('rotate') ?? 0)).toBe(1)
    // It is back in the can before the answer is over.
    frame.rows.water.tap = 0.9
    expect((paint(board, frame).into.calls.get('rotate') ?? 0) - (still.calls.get('rotate') ?? 0)).toBe(0)
    frame.rows.water.tapped = -1; frame.rows.water.tap = 0
    frame.rows.oil.tapped = 1; frame.rows.oil.tap = 0.4
    expect((paint(board, frame).into.calls.get('rotate') ?? 0) - (still.calls.get('rotate') ?? 0)).toBe(0)
  })

  it('draws the snack tin where it is: in its place, nowhere while a raccoon has it, and in the ring of stones for the picnic', () => {
    const board = boardFor(W, H, SITES.summit[0], 0), frame = restGameFrame(board)
    const tins = (where: GameFrame['tinAt']) => { frame.tinAt = where; return paint(board, frame).into.log.filter((entry) => entry.startsWith('translate(')) }
    const home = `translate(${board.tin.x.toFixed(3)},${board.tin.y.toFixed(3)})`, ring = `translate(${board.fire.x.toFixed(3)},${board.fire.y.toFixed(3)})`
    const dial = tins('taken').filter((entry) => entry === ring).length
    expect(tins('home').filter((entry) => entry === home).length).toBe(1)
    expect(tins('taken').filter((entry) => entry === home).length).toBe(0)
    expect(tins('ring').filter((entry) => entry === home).length).toBe(0)
    expect(tins('ring').filter((entry) => entry === ring).length).toBe(dial + 1)
  })

  it('counts the hours on the ruler, one numeral at each division from dusk', () => {
    for (const [site, unfolded] of [[SITES.meadow[0], 0], [SITES.summit[0], 1], [SITES.tarn[0], 2], [SITES.saddle[1], 0]] as const) {
      const board = boardFor(W, H, site, unfolded), found = onRuler(board, paint(board, restGameFrame(board)).into.texts)
      expect(found.map((t) => Number(t.text))).toEqual(Array.from({ length: board.hours }, (_, k) => k + 1))
      found.forEach((t, k) => expect(t.x).toBeCloseTo(hourX(board, k + 1), 3))
    }
    // A leaf on its way out carries its hours with it: still one numeral for each hour, wherever the leaf is.
    const board = boardFor(W, H, SITES.meadow[0], 1), frame = restGameFrame(board)
    const flat = paint(board, frame).into.texts.length
    frame.rulerFold = 0.4
    expect(paint(board, frame).into.texts.length).toBe(flat)
  })

  it('lays no numeral on the ash', () => {
    const board = boardFor(W, H, SITES.summit[0], 2), frame = busy(board)
    frame.strips = { fire: [], lantern: [], kettle: [] }
    const withAsh = paint(board, frame)
    // Nothing is written in the rows of ash, however much has burned.
    expect(within(withAsh.into.texts, 0, board.w, board.ash.y, board.ash.y + 3 * board.ash.row)).toEqual([])
    frame.ash = { fire: null, lantern: null, kettle: null }
    const without = paint(board, frame)
    expect(without.into.texts.length).toBe(withAsh.into.texts.length)
    // The ash itself is there: three rows of it.
    expect(withAsh.kit - without.kit).toBe(3)
  })

  it('writes the running total at the end of every stamp, and a half as a fraction', () => {
    const board = boardFor(W, H, SITES.tarn[0], 0), frame = restGameFrame(board)
    const bare = paint(board, frame).into.texts.length
    frame.strips.fire = [{ card: 1, amount: { pieces: 5, hours: 2 }, current: true, stamps: [{ side: 'halved', hours: P(1), pieces: P(5, 2) }, { side: 'halved', hours: P(2), pieces: P(5) }, { side: 'single', hours: P(4), pieces: P(10) }] }]
    const { into } = paint(board, frame)
    const row = within(into.texts, board.ruler.x, board.w, board.strips.y - 2 * board.u, board.strips.y + board.strips.row + 2 * board.u)
    // Two and a half is a two with a one over a two beside it; then the whole totals, each under the hour it has reached.
    expect(row.map((t) => t.text).sort()).toEqual(['1', '10', '2', '2', '5'])
    expect(into.texts.length).toBe(bare + 5)
    expect(row.find((t) => t.text === '10')!.x).toBeCloseTo(hourX(board, 4), 3)
    expect(row.find((t) => t.text === '5')!.x).toBeCloseTo(hourX(board, 2), 3)
  })

  it('draws to be read the row of the card the dial stands on and, under it, the row stamped last before it, hour under hour', () => {
    const board = boardFor(W, H, SITES.tarn[0], 0), frame = restGameFrame(board)
    const bare = paint(board, frame).into.texts.length
    const halved = [{ side: 'halved' as const, hours: P(1), pieces: P(5, 2) }, { side: 'halved' as const, hours: P(2), pieces: P(5) }, { side: 'halved' as const, hours: P(3), pieces: P(15, 2) }]
    frame.strips.fire = [
      { card: 0, amount: { pieces: 3, hours: 2 }, current: false, stamps: stamps(3, 6) },
      { card: 2, amount: { pieces: 6, hours: 2 }, current: false, stamps: stamps(6, 4) },
      { card: 1, amount: { pieces: 5, hours: 2 }, current: true, stamps: halved },
    ]
    const { into } = paint(board, frame)
    const added = into.texts.slice(0).filter((t) => t.y > board.strips.y - 1)
    const first = added.filter((t) => t.y < board.strips.y + board.strips.row), second = added.filter((t) => t.y >= board.strips.y + board.strips.row)
    // The oldest card is a faint line and writes nothing; the current row's three totals and the other card's four are there.
    expect(into.texts.length).toBe(bare + 11)
    expect(first.map((t) => t.text).sort()).toEqual(['1', '1', '2', '2', '2', '5', '7'])
    expect(second.map((t) => t.text).sort()).toEqual(['12', '18', '24', '6'])
    // The two rows can be read against each other: the totals for the same hour stand one under the other.
    expect(second.find((t) => t.text === '12')!.x).toBeCloseTo(first.find((t) => t.text === '5')!.x, 3)
    expect(second.find((t) => t.text === '12')!.x).toBeCloseTo(hourX(board, 2), 3)
    for (const drawn of added) {
      // In the harder pencil, and every digit inside its own row, the halves too.
      expect(drawn.ink).toBe('#4f4a45')
      const row = drawn.y < board.strips.y + board.strips.row ? 0 : 1
      expect(drawn.y - drawn.size * 0.36).toBeGreaterThanOrEqual(board.strips.y + row * board.strips.row - 0.5)
      expect(drawn.y + drawn.size * 0.36).toBeLessThanOrEqual(board.strips.y + (row + 1) * board.strips.row + 0.5)
    }
    // Each whole number is twelve pixels or more; the stacked half beside it is small.
    const wholes = first.filter((t) => ['2', '5', '7'].includes(t.text) && t.size > 10)
    expect(wholes.length).toBe(3)
    for (const drawn of wholes) expect(drawn.size).toBeGreaterThanOrEqual(12)
    // With no card the dial stands on, the row stamped last is still read, alone and at the top.
    frame.strips.fire[2].current = false
    const alone = paint(board, frame).into.texts.filter((t) => t.y > board.strips.y - 1)
    expect(alone.length).toBe(7)
    for (const drawn of alone) expect(drawn.y).toBeLessThan(board.strips.y + board.strips.row)
  })

  it('writes the hours of a stamp that ends half way between two hours: on a line of their own over stamps shorter than an hour', () => {
    const board = boardFor(W, H, SITES.summit[0], 0), frame = restGameFrame(board)
    const bare = paint(board, frame).into.texts.length
    // Three logs for one hour, halved: half an hour and a log and a half, then one hour and three logs, then an hour and a half.
    frame.strips.fire = [{ card: 0, amount: { pieces: 3, hours: 1 }, current: true, stamps: [{ side: 'halved', hours: P(1, 2), pieces: P(3, 2) }, { side: 'halved', hours: P(1), pieces: P(3) }, { side: 'halved', hours: P(3, 2), pieces: P(9, 2) }] }]
    const layout = stripLayout(frame.strips, board.strips.row / board.u)
    expect(layout.map((one) => [one.user, one.top, one.line])).toEqual([['fire', 13, 13]])
    const { into } = paint(board, frame)
    const added = into.texts.filter((t) => t.y > board.strips.y - 1), line = board.strips.y + 13 * board.u
    // A half as one over two; one and a half as a one with one over two; then three; one and a half hours; four and a half.
    expect(into.texts.length).toBe(bare + 12)
    const above = added.filter((t) => t.y < line), below = added.filter((t) => t.y >= line)
    // Hours above, pieces below: a half, and one and a half, each over the end of its own stamp.
    expect(above.map((t) => t.text).sort()).toEqual(['1', '1', '1', '2', '2'])
    expect(below.map((t) => t.text).sort()).toEqual(['1', '1', '1', '2', '2', '3', '4'])
    for (const drawn of above) expect(Math.min(Math.abs(drawn.x - hourX(board, 0.5)), Math.abs(drawn.x - hourX(board, 1.5)))).toBeLessThan(9 * board.u)
    expect(below.find((t) => t.text === '3')!.x).toBeCloseTo(hourX(board, 1), 3)
    for (const drawn of added) {
      expect(drawn.y - drawn.size * 0.36).toBeGreaterThanOrEqual(board.strips.y - 0.5)
      expect(drawn.y + drawn.size * 0.36).toBeLessThanOrEqual(board.strips.y + (13 + 19) * board.u + 0.5)
    }
  })

  it('writes the hours beside a longer stamp that ends half way: left of its end, and the total right of it', () => {
    const board = boardFor(W, H, SITES.summit[0], 0), frame = restGameFrame(board)
    // One flask for three hours, halved: an hour and a half and half a flask, then three hours and one flask.
    frame.strips.lantern = [{ card: 0, amount: { pieces: 1, hours: 3 }, current: true, stamps: [{ side: 'halved', hours: P(3, 2), pieces: P(1, 2) }, { side: 'halved', hours: P(3), pieces: P(1) }] }]
    expect(stripLayout(frame.strips, board.strips.row / board.u).map((one) => one.line)).toEqual([0])
    const added = paint(board, frame).into.texts.filter((t) => t.y > board.strips.y - 1), end = hourX(board, 1.5)
    expect(added.map((t) => t.text).sort()).toEqual(['1', '1', '1', '1', '2', '2'])
    // One and a half to the left of the end of its stamp, a half to the right of it, and the whole flask under its own hour.
    expect(added.filter((t) => t.x < end).map((t) => t.text).sort()).toEqual(['1', '1', '2'])
    expect(added.filter((t) => t.x > end && t.x < hourX(board, 2.5)).map((t) => t.text).sort()).toEqual(['1', '2'])
    expect(added.filter((t) => t.x > hourX(board, 2.5))[0].x).toBeCloseTo(hourX(board, 3), 3)
  })

  it('finds room for a line of hours: the rows lie closer, then a second card\'s row gives way, and a row with no room writes its hours beside each end', () => {
    const halves = (per: number, count: number) => Array.from({ length: count }, (_, k) => ({ side: 'halved' as const, hours: P(k + 1, 2), pieces: P(per * (k + 1), 2) }))
    const strips: GameFrame['strips'] = {
      fire: [{ card: 0, amount: { pieces: 2, hours: 1 }, current: false, stamps: stamps(2, 4) }, { card: 1, amount: { pieces: 3, hours: 1 }, current: true, stamps: halves(3, 5) }],
      lantern: [{ card: 1, amount: { pieces: 1, hours: 2 }, current: true, stamps: [{ side: 'single', hours: P(2), pieces: P(1) }] }],
      kettle: [{ card: 0, amount: { pieces: 5, hours: 1 }, current: true, stamps: stamps(5, 3) }],
    }
    // Four rows and a line of hours do not fit: the fire's other card goes back to a faint line.
    let layout = stripLayout(strips, 19)
    expect(layout.map((one) => [one.user, one.row.card, one.line, one.faint.length])).toEqual([['fire', 1, 13, 1], ['lantern', 1, 0, 0], ['kettle', 0, 0, 0]])
    expect(layout[2].top + layout[2].high).toBeLessThanOrEqual(63)
    // Without the kettle's strip both of the fire's rows are read, with the line of hours.
    strips.kettle = []
    layout = stripLayout(strips, 19)
    expect(layout.map((one) => [one.user, one.row.card, one.line])).toEqual([['fire', 1, 13], ['fire', 0, 0], ['lantern', 1, 0]])
    expect(layout[2].top + layout[2].high).toBeLessThanOrEqual(63)
    // Three users, each with stamps of half an hour: there is room for one line, and the others write their hours beside each end.
    strips.fire = [strips.fire[1]]
    strips.lantern = [{ card: 1, amount: { pieces: 1, hours: 1 }, current: true, stamps: halves(1, 3) }]
    strips.kettle = [{ card: 0, amount: { pieces: 5, hours: 1 }, current: true, stamps: halves(5, 3) }]
    layout = stripLayout(strips, 19)
    expect(layout.map((one) => one.line)).toEqual([13, 0, 0])
    expect(layout[2].top + layout[2].high).toBeLessThanOrEqual(63)
  })

  it('reads four rows at once inside the sheet, and leaves a fifth as a faint line', () => {
    const board = boardFor(W, H, SITES.summit[0], 0), frame = restGameFrame(board)
    frame.strips.fire = [{ card: 0, amount: { pieces: 2, hours: 1 }, current: false, stamps: stamps(2, 4) }, { card: 1, amount: { pieces: 3, hours: 1 }, current: true, stamps: stamps(3, 4) }]
    frame.strips.lantern = [{ card: 0, amount: { pieces: 1, hours: 3 }, current: false, stamps: [{ side: 'single', hours: P(3), pieces: P(1) }] }, { card: 1, amount: { pieces: 1, hours: 2 }, current: true, stamps: [{ side: 'single', hours: P(2), pieces: P(1) }, { side: 'single', hours: P(4), pieces: P(2) }] }]
    frame.strips.kettle = [{ card: 0, amount: { pieces: 5, hours: 1 }, current: true, stamps: stamps(5, 3) }]
    const bands = rowsRead(frame.strips)
    expect(bands.map((band) => [band.user, band.read.map((row) => row.card), band.faint.map((row) => row.card)])).toEqual([['fire', [1, 0], []], ['lantern', [1], [0]], ['kettle', [0], []]])
    const added = paint(board, frame).into.texts.filter((t) => t.y > board.strips.y - 1)
    // Four rows of totals: four and four for the fire, two for the lantern, three for the kettle, and nothing for the lantern's older card.
    expect(added.length).toBe(13)
    for (const drawn of added) expect(drawn.y + drawn.size * 0.36).toBeLessThanOrEqual(board.h - board.inset + 1)
    // Without the kettle's strip there is room, and the lantern's two cards are read as well.
    frame.strips.kettle = []
    expect(rowsRead(frame.strips).map((band) => band.read.length)).toEqual([2, 2])
  })

  it('tells the three rows of ash apart by a little of each supply\'s colour', () => {
    const board = boardFor(W, H, SITES.summit[0], 2), frame = busy(board)
    const ashes = ['#b09a80', '#b9ad68', '#869db8'], withAsh = paint(board, frame).into.fills
    for (const tone of ashes) expect(withAsh.has(tone)).toBe(true)
    frame.ash = { fire: null, lantern: null, kettle: null }
    const without = paint(board, frame).into.fills
    for (const tone of ashes) expect(without.has(tone)).toBe(false)
  })

  it('shows a lantern\'s flame in its glass when it burns and its wick when it does not, taller on the high wick', () => {
    const board = boardFor(W, H, SITES.quarry[0], 0), frame = restGameFrame(board)
    const log = () => paint(board, frame).into.log.join('|')
    const unlitLow = log()
    frame.lanterns[0].lit = true
    const litLow = log()
    frame.lanterns[0].wick = 1
    const litHigh = log()
    frame.lanterns[0].lit = false
    const unlitHigh = log()
    expect(new Set([unlitLow, litLow, litHigh, unlitHigh]).size).toBe(4)
    // The flame is drawn in two fills more than the wick's stub, and only while it burns.
    frame.lanterns[0].lit = true
    expect(paint(board, frame).into.fills.has('#ffd34d')).toBe(true)
    frame.lanterns[0].lit = false
    expect(paint(board, frame).into.fills.has('#ffd34d')).toBe(false)
  })

  it('shows on a card one numeral beside its span and one beside its pieces, on whichever side it lies', () => {
    const board = boardFor(W, H, SITES.meadow[0], 0), frame = restGameFrame(board), card = frame.cards.fire!
    const onCard = () => within(paint(board, frame).into.texts, card.x - 44 * board.u, card.x + 44 * board.u, card.y - 26 * board.u, card.y + 26 * board.u).sort((a, b) => a.y - b.y).map((t) => t.text)
    expect(onCard()).toEqual(['1', '3'])
    card.side = 'doubled'
    expect(onCard()).toEqual(['2', '6'])
    card.side = 'halved'
    // Half an hour and a log and a half: a fraction alone, and a whole number with a fraction.
    expect(onCard().sort()).toEqual(['1', '1', '1', '2', '2'])
    // A number with a half takes the height of its half of the card: no digit of it is under nine pixels.
    const texts = within(paint(board, frame).into.texts, card.x - 44 * board.u, card.x + 44 * board.u, card.y - 26 * board.u, card.y + 26 * board.u)
    for (const drawn of texts) { expect(drawn.size).toBeGreaterThanOrEqual(9); expect(Math.abs(drawn.y - card.y)).toBeLessThan(24 * board.u) }
    // Part way through a flip the card shows its bare back.
    card.flip = 0.3
    expect(onCard()).toEqual([])
  })

  it('counts the places of the sled in fives, and only where there is a sled', () => {
    const summit = boardFor(W, H, SITES.summit[0], 0), bed = summit.sled!
    const beside = within(paint(summit, restGameFrame(summit)).into.texts, summit.flap.top, bed.x, bed.top, summit.h).sort((a, b) => a.y - b.y)
    expect(beside.map((t) => Number(t.text))).toEqual(Array.from({ length: Math.floor(bed.places / 5) }, (_, k) => (k + 1) * 5))
    const meadow = boardFor(W, H, SITES.meadow[0], 0)
    expect(meadow.sled).toBeNull()
    expect(within(paint(meadow, restGameFrame(meadow)).into.texts, meadow.flap.top, meadow.w, 0, meadow.h)).toEqual([])
  })

  it('keeps every whole numeral at least eleven pixels tall, on a small surface too', () => {
    for (const [w, h] of [[W, H], [1024, 768], [700, 480]]) {
      const board = boardFor(w, h, SITES.summit[0], 2), frame = restGameFrame(board)
      frame.rows.logs.length = 12
      frame.strips.fire = [{ card: 0, amount: { pieces: 2, hours: 1 }, current: true, stamps: stamps(2, 6) }]
      const { into } = paint(board, frame)
      for (const drawn of into.texts) expect(drawn.size).toBeGreaterThanOrEqual(10.99)
      // Where the surface is the designed size and there is room, a numeral on the kit is thirteen or more.
      if (w === W) for (const drawn of [...onRuler(board, into.texts), ...underRod(board, into.texts, 0)]) expect(drawn.size).toBeGreaterThanOrEqual(13)
    }
  })

  it('holds no state between frames: the same frame is the same picture', () => {
    const board = boardFor(W, H, SITES.summit[0], 2)
    const first = paint(board, busy(board)).into.log
    paint(board, restGameFrame(board))
    const again = paint(board, busy(board)).into.log
    expect(again).toEqual(first)
    expect(first.length).toBeGreaterThan(1000)
  })

  it('keeps the busiest frame inside the draw budget', () => {
    const board = boardFor(W, H, SITES.summit[0], 2)
    const still = paint(board, restGameFrame(board)), full = paint(board, busy(board))
    expect(full.kit).toBeGreaterThan(still.kit + 20)
    // Under about 220 small figures with everything laid out, and no layer stamped over the whole surface.
    expect(full.kit + full.top).toBeLessThan(220)
    expect(full.into.calls.get('drawImage') ?? 0).toBe(0)
    expect(full.into.log.some((entry) => entry.startsWith('globalCompositeOperation'))).toBe(false)
    // What the surface is really asked to do stays bounded too: fills, strokes and text together.
    const asked = ['fill', 'stroke', 'fillText', 'strokeText', 'fillRect', 'strokeRect'].reduce((sum, name) => sum + (full.into.calls.get(name) ?? 0), 0)
    expect(asked).toBeLessThan(900)
  })

  it('draws over everything only the piece in the hand, the glow where it is told, and the ghost hand', () => {
    const board = boardFor(W, H, SITES.summit[0], 0), frame = restGameFrame(board)
    expect(paint(board, frame).top).toBe(0)
    frame.carried = { thing: 'log', x: 400, y: 300 }
    expect(paint(board, frame).top).toBe(1)
    // A card or a lantern in the hand is the frame's own, held, and the kit has drawn it: nothing is drawn twice.
    frame.carried = { thing: 'card', x: 400, y: 300 }
    expect(paint(board, frame).top).toBe(0)
    frame.carried = { thing: 'lantern', x: 400, y: 300 }
    expect(paint(board, frame).top).toBe(0)
    frame.carried = null
    // The glow lies round the places it is given and nowhere else, and not at all at no strength.
    frame.halos = [{ x: board.pile, y: board.lanes[0], r: 40 }, { x: board.corner.x, y: board.corner.y, r: 44 }]
    expect(paint(board, frame).top).toBe(0)
    frame.glow = 0.8
    const glowing = paint(board, frame)
    expect(glowing.top).toBe(1)
    expect(glowing.into.calls.get('arc')! - paint(board, { ...frame, glow: 0 }).into.calls.get('arc')!).toBe(6)
    frame.halos = []
    expect(paint(board, frame).top).toBe(0)
    frame.hand = { x: 300, y: 500, press: 0.5, opacity: 0.9 }
    expect(paint(board, frame).top).toBe(1)
  })

  it('draws nothing on a surface that has no size yet', () => {
    const board = boardFor(0, 0, SITES.meadow[0], 0), into = recorder(), ctx = fakeContext(into)
    expect(paintKit(ctx, board, restGameFrame(boardFor(W, H, SITES.meadow[0], 0)), { night: false })).toBe(0)
    expect(paintTop(ctx, board, restGameFrame(boardFor(W, H, SITES.meadow[0], 0)))).toBe(0)
    expect(into.calls.size).toBe(0)
  })
})
