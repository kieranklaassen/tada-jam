import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { WIDE, outlines } from './figures'
import { FIRST_SEED, stir } from './layout'
import { IDLE_SECONDS, REST, blend, idle } from './motion'
import { CORNER } from './overlay'
import { type Picture, type Spot, STONE_FEET, type Thing, pictureOf, targetOf, whatIsAt } from './picture'
import { type Play, direct, finalSpot, riderOn, twinAt } from './plays'
import { poseOf } from './show'
import { RIDER, askerSize, hillSize, littleSize, twinApart, twinSize } from './sizes'
import { EGG, FLOOR, HILL_SPOTS, type Rect, TARGET, WRIST_LINE, eggSpots, gap, inView, toStage } from './stage'
import { KINDS, type Kind } from './voices'
import { type Action, type Happening, type World, act, freshWorld, waitingOf } from './world'

// Nothing passes through anything. This is a canvas game, so the audit of live
// scenes cannot read it and these tests stand in for it (docs/solutions/
// conventions/building-a-jam-game.md, "Canvas or three.js"). Whole games are
// played on the real model with seeded taps, and what a child would see cross
// is measured in design pixels: in the picture every saved world is drawn
// from, and in every play on the way from one picture to the next.

// --- The budgets, in design pixels -------------------------------------------

/** Two neighbours of the row never touch. The nearest two can come is 10: the wide kind beside the long-necked one, grown, in a row of four. */
const ROW_GAP = 10
/**
 * By its plain footprint the one who asks stays this far from the first spot of the row: the wide kind at the
 * stone with four in the row leaves 35.55.
 */
const ASKER_GAP = 35
/**
 * The one who asks holds both wings out to the row on purpose, and they may reach this far over the first spot.
 * The worst is the wide kind (`hoom`) with four in the row: at the far end of its idle sway its wing tip is 36.7
 * past the left side of the first hide, and 0.7 past it with three in the row.
 */
const WING_REACH = 38
/** How far short of the first spot the wings of every kind but the wide one stay. The nearest is the droopy one with four in the row: 33.06 short. */
const WING_SHORT = 30
/** No two on the hill touch. The nearest two can come is 28.9: two little ones of the wide kind beside two of the tiny round one. */
const HILL_GAP = 28
/** The basket keeps this far from the last hide of a full row, and from whatever waits at the edge: 24 from each. */
const BASKET_GAP = 24
/** The clear page between two things that can be tapped. The nearest are 24 apart: two hides in a row of four, the last of them and the basket, the basket and the clutch that waits. */
const CLEAR = 24
/** How far below the wrist line anyone on stage may get: a body squashes and a shell falls, but nobody goes down into the bottom of the page. */
const BELOW = 40
/** Each play is looked at this many times from its start to its end. */
const INSTANTS = 30

// --- The games ---------------------------------------------------------------

type Tap = { before: World; action: Action; after: World; happened: Happening[] }
const TAPS_A_GAME = 300
/** Two surfaces: the design's own shape, and a wider, lower one that shows more page at both sides. */
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1400, 700]]
const VIEWS: readonly Rect[] = SURFACES.map(([width, height]) => inView(width, height))

/**
 * Two children at every place of the order: one who taps anywhere at all, as in play.test.ts, and one who only
 * ever taps something that is there, mostly in front of the hill, so that hides are opened all the time.
 */
function games(): Tap[] {
  const taps: Tap[] = []
  for (const anywhere of [true, false]) for (const [n, place] of LADDER.entries()) {
    const own = n + (anywhere ? 0 : 50)
    let world = freshWorld(null, stir(FIRST_SEED, own), place), rng = stir(FIRST_SEED, 100 + own)
    for (let i = 0; i < TAPS_A_GAME; i++) {
      rng = stir(rng, i)
      const roll = rng % 100, spot = (rng >>> 8) % 5
      let action: Action = roll < 55 ? { type: 'slot', slot: spot } : roll < 75 ? { type: 'edge' } : roll < 85 ? { type: 'asker' } : roll < 93 ? { type: 'basket' } : { type: 'resident', resident: spot }
      if (!anywhere) {
        const picture = pictureOf(world, VIEWS[0]), front = picture.things.filter((thing) => !('place' in thing))
        const pool = roll < 88 && front.length > 0 ? front : picture.things, target = targetOf(pool[(rng >>> 8) % pool.length], picture)
        action = whatIsAt(picture, world, target.x + target.w / 2, target.y + target.h / 2) ?? action
      }
      const step = act(world, action)
      taps.push({ before: world, action, after: step.world, happened: step.happened })
      world = step.world
    }
  }
  return taps
}

const TAPS = games()
/** Every world the games passed through, each once. */
const WORLDS: World[] = [...new Map([TAPS[0].before, ...TAPS.map((tap) => tap.after)].map((world) => [JSON.stringify(world), world])).values()]
const PICTURES = SURFACES.flatMap(([width, height]) => WORLDS.map((world) => ({ world, picture: pictureOf(world, inView(width, height)), width, height })))

// --- Measuring -----------------------------------------------------------------

const box = (x: number, y: number, w: number, h: number): Rect => ({ x: x - w / 2, y: y - h, w, h })
const base = (thing: Thing) => thing.key.split(':')[0]
const what = (thing: Thing) => ('what' in thing ? thing.what : 'egg')

/**
 * What a thing covers, from its feet and what it is. A hide is an egg's size whoever is in it; a figure is its
 * height and `WIDE` of it across; a family is the grown one with its rider's height on top; twins are two; and
 * the one at the edge may reach off the page, so there it is what a finger can land on.
 */
function footprint(thing: Thing, picture: Picture): Rect[] {
  if (thing.key === 'edge') return [targetOf(thing, picture)]
  if (thing.key === 'basket') return [box(thing.x, thing.y, 150, 150)]
  if (thing.what === 'egg' || thing.what === 'pile') return [box(thing.x, thing.y, (EGG.w * thing.size) / EGG.h, thing.size)]
  if (thing.what === 'twins') return [-1, 1].map((side) => box(thing.x + side * twinApart(thing.kind), thing.y, twinSize(thing.kind) * WIDE[thing.kind], twinSize(thing.kind)))
  if (thing.what === 'family') return [box(thing.x, thing.y, thing.size * WIDE[thing.kind], thing.size * (RIDER.up + RIDER.size))]
  return [box(thing.x, thing.y, thing.size * WIDE[thing.kind], thing.size)]
}

/** The clear page between two things: 0 or less when they touch or overlap. */
const between = (a: Rect[], b: Rect[]) => Math.min(...a.flatMap((one) => b.map((other) => gap(one, other))))
const named = (thing: Thing, picture: Picture) => `${thing.key} (${what(thing)} ${thing.kind ?? ''}${'slot' in thing ? ` of ${picture.row}` : ''})`

/** How near two things of two sorts come in all the pictures, and which two. Infinity when the two sorts never stand together. */
function nearest(sorts: (a: Thing, b: Thing) => boolean, measure: (thing: Thing, picture: Picture) => Rect[]): { gap: number; pair: string } {
  let least = { gap: Infinity, pair: '' }
  for (const { picture } of PICTURES) {
    const things = picture.things
    for (let i = 0; i < things.length; i++) for (let j = 0; j < things.length; j++) {
      if (i === j || !sorts(things[i], things[j])) continue
      const clear = between(measure(things[i], picture), measure(things[j], picture))
      if (clear < least.gap) least = { gap: clear, pair: `${named(things[i], picture)} and ${named(things[j], picture)}` }
    }
  }
  return least
}

/**
 * How far right the one who asks reaches at the height of the hides, standing on the stone as the view lays it
 * there (view.ts): both wings out to the row and its face turned to it, at any moment of its idle round.
 */
function wingReach(kind: Kind, size: number): number {
  let most = -Infinity
  for (let i = 0; i < 24; i++) {
    const move = blend(idle(kind, (IDLE_SECONDS[kind] * i) / 24, 0.4), { ...REST, wings: 1, reach: 1, turn: 1, lean: 0.045 })
    for (const piece of outlines(kind, size, move)) for (const [x, y] of piece) {
      if (STONE_FEET.y + move.dy * size + y * move.sy >= FLOOR - EGG.h) most = Math.max(most, STONE_FEET.x + move.dx * size + x * move.sx * move.face)
    }
  }
  return most
}

/** What went wrong, short enough to read: each different thing once, and the first few. */
const told = (wrong: string[]) => [...new Set(wrong)].slice(0, 6)

// --- The tests -----------------------------------------------------------------

describe('the games played here', () => {
  const count = (holds: (world: World, picture: Picture) => boolean) => PICTURES.filter(({ world, picture }) => holds(world, picture)).length

  it('reach every way of asking, leaf piles, a row of four and a full hill', () => {
    for (const form of ['seek', 'who', 'alike'] as const) expect(count((_, picture) => picture.form === form), form).toBeGreaterThan(0)
    expect(count((_, picture) => picture.leaves)).toBeGreaterThan(0)
    // Four in a row that came as three: the basket was tipped in.
    expect(count((_, picture) => picture.row === 4 && picture.form === 'seek')).toBeGreaterThan(0)
    expect(count((_, picture) => picture.row === 4 && picture.form === 'who')).toBeGreaterThan(0)
    expect(count((world) => world.hill.length === 4)).toBeGreaterThan(0)
    for (const as of ['family', 'twins', 'single']) expect(count((world) => world.hill.some((resident) => resident.as === as)), as).toBeGreaterThan(0)
  })

  it('reach someone waiting at the edge within a cycle, a clutch waiting between cycles, and the basket beside both', () => {
    expect(count((world) => !world.finished && waitingOf(world) !== null)).toBeGreaterThan(0)
    expect(count((world) => world.finished && world.cycle !== null && waitingOf(world) !== null)).toBeGreaterThan(0)
    for (const sort of ['grown', 'egg', 'clutch']) expect(count((_, picture) => picture.things.some((thing) => thing.key === 'edge' && thing.what === sort)), sort).toBeGreaterThan(0)
    expect(count((world, picture) => world.finished && picture.things.some((thing) => thing.key === 'basket'))).toBeGreaterThan(0)
    expect(count((world, picture) => !world.finished && picture.things.some((thing) => thing.key === 'basket'))).toBeGreaterThan(0)
    // At the stone: a grown one, an egg, and a little one.
    for (const sort of ['grown', 'egg', 'little']) expect(count((_, picture) => picture.things.some((thing) => thing.key === 'asker' && thing.what === sort)), sort).toBeGreaterThan(0)
  })

  it('make everything happen that a play can show', () => {
    const happened = new Set(TAPS.flatMap((tap) => tap.happened.map((one) => one.type)))
    for (const type of ['arrives', 'shows', 'asks', 'finds', 'peeks', 'hears', 'meets', 'stepsOut', 'settles', 'leaves', 'rollCall', 'tips', 'basket', 'calls', 'ends', 'nothing']) expect(happened, type).toContain(type)
    for (const form of ['seek', 'who', 'alike']) expect(TAPS.some((tap) => tap.happened.some((one) => one.type === 'shows' && one.form === form)), `the showing of ${form}`).toBe(true)
    expect(TAPS.some((tap) => tap.happened.some((one) => one.type === 'meets' && one.meeting.match))).toBe(true)
    expect(TAPS.some((tap) => tap.happened.some((one) => one.type === 'meets' && !one.meeting.match))).toBe(true)
  })
})

describe('the picture of a saved world', () => {
  const slot = (thing: Thing) => base(thing) === 'slot', hill = (thing: Thing) => base(thing) === 'hill'

  it('has no two of the row touching', () => {
    const row = nearest((a, b) => slot(a) && slot(b), footprint)
    expect(row.gap, row.pair).toBeGreaterThanOrEqual(ROW_GAP)
  })

  it('keeps the plain footprint of the one who asks clear of the row', () => {
    const asker = nearest((a, b) => a.key === 'asker' && slot(b), footprint)
    expect(asker.gap, asker.pair).toBeGreaterThanOrEqual(ASKER_GAP)
  })

  it('lets the wings of the one who asks reach over the first spot of the row only so far, and only those of the wide one', () => {
    const over: { kind: Kind; row: number; by: number }[] = []
    for (const kind of KINDS) {
      // A grown one asks in a row of two to four; a little one only ever in a row of four.
      const grown = wingReach(kind, askerSize(kind)), little = wingReach(kind, littleSize(kind))
      for (const row of [2, 3, 4]) over.push({ kind, row, by: grown - eggSpots(row)[0].x })
      over.push({ kind, row: 4, by: little - eggSpots(4)[0].x })
    }
    const worst = over.reduce((a, b) => (b.by > a.by ? b : a))
    expect(worst.by, `${worst.kind} with ${worst.row} in the row`).toBeLessThanOrEqual(WING_REACH)
    expect([worst.kind, worst.row]).toEqual(['hoom', 4])
    // The reach is real: the budget is not held by a figure that keeps its wings in.
    expect(worst.by).toBeGreaterThan(0)
    for (const one of over) if (one.kind !== 'hoom') expect(one.by, `${one.kind} with ${one.row} in the row`).toBeLessThanOrEqual(-WING_SHORT)
  })

  it('has no two on the hill touching', () => {
    const two = nearest((a, b) => hill(a) && hill(b), footprint)
    expect(two.gap, two.pair).toBeGreaterThanOrEqual(HILL_GAP)
    // And no two that could ever stand side by side there: every kind, as a family, as twins and alone.
    const wide = (kind: Kind, as: string) => (as === 'twins' ? twinApart(kind) * 2 + twinSize(kind) * WIDE[kind] : (as === 'family' ? hillSize(kind) : littleSize(kind)) * WIDE[kind])
    const step = Math.min(...HILL_SPOTS.slice(1).map((spot, i) => spot.x - HILL_SPOTS[i].x))
    let least = { gap: Infinity, pair: '' }
    for (const a of KINDS) for (const b of KINDS) for (const one of ['family', 'twins', 'single']) for (const other of ['family', 'twins', 'single']) {
      if (a === b) continue
      const clear = step - (wide(a, one) + wide(b, other)) / 2
      if (clear < least.gap) least = { gap: clear, pair: `${a} ${one} and ${b} ${other}` }
    }
    expect(least.gap, least.pair).toBeGreaterThanOrEqual(HILL_GAP)
    expect(least.pair.split(' and ').sort()).toEqual(['hoom twins', 'pip twins'])
  })

  it('keeps the basket clear of the row and of whatever waits at the edge', () => {
    const row = nearest((a, b) => a.key === 'basket' && slot(b), footprint)
    expect(row.gap, row.pair).toBeGreaterThanOrEqual(BASKET_GAP)
    const edge = nearest((a, b) => a.key === 'basket' && b.key === 'edge', footprint)
    expect(edge.gap, edge.pair).toBeGreaterThanOrEqual(BASKET_GAP)
    expect(Number.isFinite(row.gap) && Number.isFinite(edge.gap)).toBe(true)
  })

  it('has nothing else overlapping either: the hill, the stone, the row, the basket and the edge all stand clear of each other', () => {
    const any = nearest((a, b) => base(a) !== base(b), footprint)
    expect(any.gap, any.pair).toBeGreaterThan(0)
  })
})

describe('what can be tapped', () => {
  const target = (thing: Thing, picture: Picture) => [targetOf(thing, picture)]

  it('is at least 100 by 100, whatever it is', () => {
    const small: string[] = []
    for (const { picture } of PICTURES) for (const thing of picture.things) {
      const rect = targetOf(thing, picture)
      if (rect.w < TARGET || rect.h < TARGET) small.push(`${named(thing, picture)} is ${rect.w} by ${rect.h}`)
    }
    expect(told(small)).toEqual([])
  })

  it('never reaches below the wrist line', () => {
    const low: string[] = []
    for (const { picture } of PICTURES) for (const thing of picture.things) {
      const rect = targetOf(thing, picture)
      if (rect.y + rect.h > WRIST_LINE) low.push(`${named(thing, picture)} reaches ${rect.y + rect.h}`)
    }
    expect(told(low)).toEqual([])
  })

  it('stands well apart: no two targets overlap, and there are 24 of clear page between the nearest two', () => {
    const two = nearest(() => true, target)
    expect(two.gap, two.pair).toBeGreaterThanOrEqual(CLEAR)
  })

  it('answers a finger in its middle as itself', () => {
    const wrong: string[] = []
    for (const { world, picture } of PICTURES) for (const thing of picture.things) {
      const rect = targetOf(thing, picture), hit = whatIsAt(picture, world, rect.x + rect.w / 2, rect.y + rect.h / 2)
      const own: Action = thing.key === 'edge' ? { type: 'edge' } : thing.key === 'asker' ? { type: 'asker' } : thing.key === 'basket' ? { type: 'basket' }
        : 'slot' in thing ? { type: 'slot', slot: thing.slot } : { type: 'resident', resident: world.hill.findIndex((resident) => resident.place === thing.place) }
      if (JSON.stringify(hit) !== JSON.stringify(own)) wrong.push(`${named(thing, picture)} answers as ${JSON.stringify(hit)}`)
    }
    expect(told(wrong)).toEqual([])
  })

  // Three quick taps in the top right corner of the surface show a grown-up the frame rate (overlay.ts).
  it('leaves the grown-up corner alone: a finger in the top right of the surface lands on nothing of the game, and so on none of the row', () => {
    const wrong: string[] = []
    for (const { world, picture, width, height } of PICTURES) {
      for (const [across, down] of [[1, 1], [CORNER / 2, CORNER / 2], [CORNER, 1], [1, CORNER], [CORNER, CORNER]]) {
        const point = toStage(width, height, width - across, down), hit = whatIsAt(picture, world, point.x, point.y)
        if (hit !== null) wrong.push(`${across} in and ${down} down on ${width} by ${height} is ${JSON.stringify(hit)}`)
      }
    }
    expect(told(wrong)).toEqual([])
  })
})

// --- Plays -------------------------------------------------------------------

type Staged = { tap: Tap; view: Rect; play: Play | null; before: Picture; after: Picture; story: string }
const STAGED: Staged[] = VIEWS.flatMap((view) => TAPS.map((tap) => ({
  tap, view, play: direct(tap.happened, tap.action, tap.before, tap.after, view, 0), before: pictureOf(tap.before, view), after: pictureOf(tap.after, view),
  story: `${tap.happened.map((one) => one.type).join(', ')} in ${tap.after.cycle?.form ?? 'no cycle'}`,
})))
const PLAYED = STAGED.filter((staged): staged is Staged & { play: Play } => staged.play !== null)

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6
const sameSpot = (a: Spot, b: Spot) => near(a.x, b.x) && near(a.y, b.y) && near(a.size, b.size)
const at = (spot: Spot) => `${spot.x.toFixed(1)}, ${spot.y.toFixed(1)} at ${spot.size.toFixed(1)}`
const onPage = (spot: { x: number }, view: Rect) => spot.x >= view.x && spot.x <= view.x + view.w
const moves = (play: Play, id: string) => play.acts.filter((one) => one.who === id && (one.do === 'go' || one.do === 'fly' || one.do === 'slide'))
/** Whether a cast member is gone when the play is over: its shell burst, or it went up and away. */
const gone = (play: Play, id: string) => play.acts.some((one) => one.who === id && (one.do === 'burst' || one.do === 'fade' || one.do === 'sink'))

/**
 * Where a cast member has to end for each thing a play hides, and who may come to stand there. A play hides a
 * thing of the picture after the tap because it shows it on its way, so when the play is over and the thing is
 * drawn again, somebody of the cast stands exactly on it.
 */
type Landing = { key: string; part: keyof typeof LANDS; spot: Spot }
const LANDS = {
  // A family on the hill: the grown one who asked (`seeker`), knocked (`grown`), came to ask and found its own (`comer`), or showed (`shower`)...
  'the grown one of a family': ['seeker', 'grown', 'comer', 'shower'],
  // ...and its little one, riding: the one let out (`out`), or the one who waited alone on the hill (`alone`).
  'the rider of a family': ['out', 'alone'],
  // Twins, the right one: the one just let out.
  'the right twin': ['out'],
  // Twins, the left one: the little one who asked (`seeker`), waited alone on the hill (`alone`), or showed (`shower`).
  'the left twin': ['seeker', 'alone', 'shower'],
  // One alone on the hill: the one let out for an asker of another kind.
  'one alone on the hill': ['out'],
  // A spot of the row: a hide tumbling in from the nest or a grown one walking in (`in`), the egg tipped from the basket (`tipped`) or, among leaf piles, the leaves that fall over it (`leaves`), a grown one sent back from a wrong knock (`grown`).
  'a spot of the row': ['in', 'tipped', 'leaves', 'grown'],
  // The stone: the one who comes to ask (`comer`), or in a row of pairs the one let out who asks next (`out`).
  'the stone': ['comer', 'out'],
} as const

function landings(play: Play, after: Picture): Landing[] {
  const out: Landing[] = []
  for (const key of play.hidden) {
    const thing = after.things.find((one) => one.key === key)
    // A play may hide a key the tap has emptied (the spot of a hide that is done): nothing stands there afterwards.
    if (!thing) continue
    const own: Spot = { x: thing.x, y: thing.y, size: thing.size }
    if ('place' in thing && thing.what === 'family') out.push({ key, part: 'the grown one of a family', spot: own }, { key, part: 'the rider of a family', spot: riderOn(own) })
    else if ('place' in thing && thing.what === 'twins') out.push({ key, part: 'the right twin', spot: twinAt(thing.kind, thing.place, 1) }, { key, part: 'the left twin', spot: twinAt(thing.kind, thing.place, -1) })
    else if ('place' in thing) out.push({ key, part: 'one alone on the hill', spot: own })
    else out.push({ key, part: thing.key === 'asker' ? 'the stone' : 'a spot of the row', spot: own })
  }
  return out
}

describe('a play', () => {
  it('is what most taps on something set going', () => {
    expect(PLAYED.length).toBeGreaterThan(STAGED.length / 4)
    // Each scene of the design sheet was played: a reunion, a meeting, a knock, a finding, a showing, a choir, an egg tipped in.
    for (const id of ['seeker', 'out', 'grown', 'alone', 'shower', 'shown', 'nest', 'comer', 'tipped', 'bowl', 'shell']) expect(PLAYED.some(({ play }) => play.cast.some((cast) => cast.id.split(':')[0] === id)), id).toBe(true)
    expect(PLAYED.some(({ play }) => play.acts.some((one) => one.do === 'face'))).toBe(true)
  })

  it('names in every act somebody of its cast or a thing of the picture after the tap', () => {
    const wrong: string[] = []
    for (const { play, after, story } of PLAYED) for (const one of play.acts) {
      if (!play.cast.some((cast) => cast.id === one.who) && !after.things.some((thing) => thing.key === one.who)) wrong.push(`${one.who} is to ${one.do}, and is nowhere (${story})`)
    }
    expect(told(wrong), `${wrong.length} acts`).toEqual([])
  })

  it('has nobody in its cast twice', () => {
    const wrong: string[] = []
    for (const { play, story } of PLAYED) {
      const ids = play.cast.map((cast) => cast.id)
      if (new Set(ids).size !== ids.length) wrong.push(`${ids.join(' ')} (${story})`)
    }
    expect(told(wrong)).toEqual([])
  })

  it('gives every act a time to start that is not before the tap, and a length', () => {
    const wrong: string[] = []
    for (const { play, story } of PLAYED) for (const one of play.acts) {
      if (!(one.lasts > 0) || !(one.at >= 0) || !(one.at + one.lasts <= play.seconds + 1e-9)) wrong.push(`${one.who} is to ${one.do} at ${one.at} for ${one.lasts} of ${play.seconds} (${story})`)
    }
    expect(told(wrong)).toEqual([])
  })

  it('brings somebody to stand exactly on every thing it hides, and the right one', () => {
    const wrong: string[] = []
    let landed = 0
    for (const { play, after, story } of PLAYED) for (const landing of landings(play, after)) {
      const there = play.cast.filter((cast) => !gone(play, cast.id) && sameSpot(finalSpot(play, cast.id)!, landing.spot))
      landed++
      if (there.length !== 1) wrong.push(`${there.length} of the cast end as ${landing.part} at ${landing.key} (${story})`)
      else if (!(LANDS[landing.part] as readonly string[]).includes(there[0].id.split(':')[0])) wrong.push(`${there[0].id} ends as ${landing.part} (${story})`)
    }
    expect(landed).toBeGreaterThan(500)
    expect(told(wrong), `${wrong.length} of ${landed}`).toEqual([])
  })

  it('leaves nobody of its cast on the page anywhere but on a thing it hid: when it is over, nothing jumps', () => {
    const wrong: string[] = []
    for (const { play, after, view, story } of PLAYED) {
      const spots = landings(play, after)
      for (const cast of play.cast) {
        const end = finalSpot(play, cast.id)!
        if (gone(play, cast.id) || !onPage(end, view) || spots.some((landing) => sameSpot(landing.spot, end))) continue
        wrong.push(`${cast.id.split(':')[0]} is left at ${at(end)} after ${moves(play, cast.id).length} moves, and the play hides ${play.hidden.join(' ') || 'nothing'} (${story})`)
      }
    }
    expect(told(wrong), `${wrong.length} of the cast`).toEqual([])
  })

  it('throws things only at a spot of the row, at the stone, or off the page', () => {
    const wrong: string[] = []
    let thrown = 0
    for (const { play, after, view, story } of PLAYED) for (const one of play.acts) {
      if (one.do !== 'fly') continue
      thrown++
      const row = after.row > 0 ? eggSpots(after.row).map((spot) => spot.x + spot.w / 2) : []
      const onRow = near(one.to.y, FLOOR) && row.some((x) => near(x, one.to.x)), onStone = near(one.to.x, STONE_FEET.x) && near(one.to.y, STONE_FEET.y)
      if (onRow || onStone || !onPage(one.to, view)) continue
      const off = row.length > 0 ? Math.min(...row.map((x) => Math.abs(x - one.to.x))) : Infinity
      wrong.push(`${one.who} lands at ${one.to.x}, ${one.to.y}, which is ${off} from the nearest spot of a row of ${after.row} (${story})`)
    }
    expect(thrown).toBeGreaterThan(100)
    expect(told(wrong), `${wrong.length} of ${thrown} throws`).toEqual([])
  })

  it('shows on its way whoever newly stands on the hill, in the row or at the stone after the tap: nobody is suddenly there', () => {
    const wrong: string[] = []
    for (const { play, before, after, story } of STAGED) for (const thing of after.things) {
      if (thing.key === 'edge' || thing.key === 'basket') continue
      const was = before.things.find((one) => one.key === thing.key)
      if (was && was.kind === thing.kind && what(was) === what(thing)) continue
      if (!play || !play.hidden.includes(thing.key)) wrong.push(`${base(thing)} ${what(thing)} is there after ${story}, and ${play ? `the play of ${play.seconds.toFixed(2)} s hides ${play.hidden.join(' ') || 'nothing'}` : 'there is no play'}`)
    }
    expect(told(wrong), `${wrong.length} things`).toEqual([])
  })

  it('brings into view whoever newly waits at the edge, and a basket with a new egg: neither is suddenly there', () => {
    const wrong: string[] = []
    for (const { play, before, after, story } of STAGED) for (const thing of after.things) {
      if (thing.key !== 'edge' && thing.key !== 'basket') continue
      const was = before.things.find((one) => one.key === thing.key)
      if (was && was.kind === thing.kind && what(was) === what(thing)) continue
      if (!play || !play.acts.some((one) => one.who === thing.key && one.do === 'arrive')) wrong.push(`${thing.key} (${what(thing)} ${thing.kind ?? ''}) is there after ${story}, and nothing arrives`)
    }
    expect(told(wrong), `${wrong.length} things`).toEqual([])
  })

  it('keeps everybody on stage on the page from its first moment to its last: above the bottom strip, not over the top, a real size', () => {
    const wrong: string[] = []
    let looked = 0
    for (const { play, view, story } of PLAYED) for (let i = 0; i < INSTANTS; i++) {
      const t = (play.seconds * i) / (INSTANTS - 1)
      const progress = play.acts.map((one) => Math.max(0, Math.min(1, (t - one.at) / one.lasts))), begun = play.acts.map((one) => t >= one.at)
      for (const cast of play.cast) {
        const posed = poseOf(cast, play, progress, begun), top = posed.y - posed.size
        looked++
        if ([posed.x, posed.y, posed.size, posed.alpha, posed.air, posed.turn, posed.lid, posed.burst ?? 0].some((value) => !Number.isFinite(value))) wrong.push(`${cast.id} is nowhere at ${t.toFixed(2)} s (${story})`)
        else if (!(posed.size > 0)) wrong.push(`${cast.id} has size ${posed.size} at ${t.toFixed(2)} s (${story})`)
        else if (posed.y > WRIST_LINE + BELOW) wrong.push(`${cast.id} is down at ${posed.y.toFixed(1)} at ${t.toFixed(2)} s (${story})`)
        else if (view.y - top > posed.size) wrong.push(`${cast.id} is up at ${posed.y.toFixed(1)} at ${t.toFixed(2)} s (${story})`)
      }
    }
    expect(looked).toBeGreaterThan(10000)
    expect(told(wrong), `${wrong.length} of ${looked} looks`).toEqual([])
  })
})
