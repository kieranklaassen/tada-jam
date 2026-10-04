import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { call, crate, feed, freshGame, give, judge, sendOff, settle, splat, treat, type Game } from './cycle'
import { WHOLE, giveOf, shareLength } from './measure'
import { ideasOf, inRange, tinParts, type Customer } from './orders'
import { MOST_PIECES, deserialize, serialize } from './save'
import { serveOf } from './serve'
import { MOST_EATEN, SHELF, cut, eaten, inTin, isWhole, onLane, onShelf, roll, setOnShelf, type Piece } from './world'

/** Cuts a piece of exactly `length` (plus `off`) from a fresh fruit of the ordered kind, and returns its id. */
function cutFor(game: Game, length: number, off = 0): { game: Game; id: number } {
  const landed = crate(game)
  const result = cut(landed.game.world, landed.id, length + off)
  if (result.kind !== 'cut') return { game: landed.game, id: landed.id }
  return { game: { ...landed.game, world: result.world }, id: result.left }
}

/**
 * Serves the customer at the window, each compartment off by `off` points: every piece is cut first, by eye,
 * and then laid in. An order longer than one fruit gets whole fruits and one cut piece.
 */
function serve(game: Game, off = 0) {
  let last = null as ReturnType<typeof give>['given']
  const lists = tinParts(game.window!).map((length) => {
    const ids: number[] = []
    let rest = length
    while (rest > WHOLE[game.window!.fruit]) {
      const landed = crate(game)
      game = landed.game
      ids.push(landed.id)
      rest -= WHOLE[game.window!.fruit]
    }
    const made = cutFor(game, rest, off)
    game = made.game
    return [...ids, made.id]
  })
  lists.forEach((ids, part) =>
    ids.forEach((id) => {
      if (game.finished) return
      const done = give(game, id, part)
      game = done.game
      last = done.given
    }),
  )
  return { game, given: last }
}

const pelican: Customer = { who: 'pelican', fruit: 'long', shares: [{ num: 1, den: 2 }], carries: 'half', written: false, lined: true }
const piece = (length: number, over: Partial<Piece> = {}): Piece => ({ id: 1, fruit: 'long', length, place: { on: 'tin', part: 0, turn: 0 }, blind: true, ruled: 0, mark: 0, ...over })

describe('a first visit', () => {
  const game = freshGame(null)

  it('opens with nobody at the window, two waiting, and one fruit on the board', () => {
    expect(game.window).toBeNull()
    expect(game.finished).toBe(false)
    expect(game.position).toBe(LADDER[0])
    for (const customer of game.queue) expect(inRange(customer)).toEqual([])
    expect(game.world.pieces).toHaveLength(1)
    expect(isWhole(game.world.pieces[0])).toBe(true)
    expect(game.shown).toEqual([])
  })

  it('starts by age only where no place is saved, and is the same for the same age', () => {
    expect(freshGame(12).position).toBe('written')
    expect(freshGame(9).position).toBe('half')
    expect(freshGame(null)).toEqual(game)
  })

  it('does nothing when there is nobody to serve', () => {
    const id = game.world.pieces[0].id
    expect(give(game, id, 0)).toEqual({ game, given: null })
    expect(sendOff(game)).toEqual({ game, ending: null })
    expect(feed(game, id)).toEqual({ game, ending: null, ate: false, shelved: [], fell: [] })
  })
})

describe('how a served order is judged', () => {
  const HALF = shareLength('long', { num: 1, den: 2 })
  it('well: it fits and every piece was cut while no tin stood open, unmarked', () => {
    expect(judge(serveOf(pelican, [[piece(HALF)]]))).toBe('well')
    expect(judge(serveOf(pelican, [[piece(HALF / 2), piece(HALF / 2, { id: 2 })]]))).toBe('well')
  })
  it('mixed: it fits with help from the open tin or the roller', () => {
    expect(judge(serveOf(pelican, [[piece(HALF, { blind: false })]]))).toBe('mixed')
    expect(judge(serveOf(pelican, [[piece(HALF, { ruled: 2 })]]))).toBe('mixed')
  })
  it('badly: the tin holds a misfit', () => {
    expect(judge(serveOf(pelican, [[piece(HALF + giveOf('long') + 1)]]))).toBe('badly')
    expect(judge(serveOf(pelican, [[]]))).toBe('badly')
  })
})

describe('a cycle', () => {
  const start = call(freshGame(null), 0)
  /** The same game moved to another place in the order, with the customer at the window carrying that place's new thing, or another's. */
  const placed = (position: string, carries: string | null = position): Game => ({ ...start.game, position, window: { ...start.game.window!, carries } })

  it('begins when the child touches one who waits: that one steps up and another joins the queue', () => {
    expect(start.did).toBe('stepped')
    expect(start.game.window).toEqual(freshGame(null).queue[0])
    expect(start.game.queue[1]).toEqual(freshGame(null).queue[1])
    expect(start.game.queue[0]).not.toBe(start.game.window)
    expect(start.game.world.tinOpen).toBe(false)
  })

  it('ends by itself when the tin shuts on a fit, and a first cut that fits moves the place up one', () => {
    const { game, given } = serve(start.game)
    expect(given).toMatchObject({ opened: true, firstShowing: 'half', ending: { outcome: 'well', glider: false } })
    expect(game.finished).toBe(true)
    expect(game.position).toBe(LADDER[1])
    expect(game.shown).toEqual(['half'])
    // Saved as the first beat starts: what was in the tin is inside the customer, in the order it is eaten.
    expect(inTin(game.world, 0)).toEqual([])
    expect(eaten(game.world)).toHaveLength(1)
    expect(eaten(game.world)[0].length).toBe(tinParts(game.window!)[0])
    // The ending stays: nothing more happens until the child calls the next one.
    expect(give(game, game.world.pieces[0].id, 0).given).toBeNull()
    expect(sendOff(game).ending).toBeNull()
  })

  it('leaves everything as it lies when the piece does not fit', () => {
    const { game, given } = serve(start.game, -400)
    expect(given).toMatchObject({ opened: true, ending: null, result: { kind: 'under', by: -400 } })
    expect(game.finished).toBe(false)
    expect(game.position).toBe(LADDER[0])
    expect(inTin(game.world, 0)).toHaveLength(1)
    expect(eaten(game.world)).toEqual([])
    expect(onLane(game.world, 0).length + onLane(game.world, 1).length).toBeGreaterThan(0)
  })

  it('is mixed, and the place stays, when the order is filled by a piece cut while the tin stood open', () => {
    const short = serve(start.game, -400).game
    const more = cutFor(short, 400)
    const done = give(more.game, more.id, 0)
    expect(done.given!.ending).toMatchObject({ outcome: 'mixed' })
    expect(done.game.position).toBe(LADDER[0])
    expect(done.game.finished).toBe(true)
    expect(eaten(done.game.world).map((piece) => piece.blind)).toEqual([true, false])
  })

  it('keeps the mark on a piece cut against an open tin, so it never counts as cut by eye for a later customer', () => {
    const short = serve(start.game, -400).game
    const trimmed = cutFor(short, 400)
    const sent = sendOff(trimmed.game)
    const next = call(sent.game, 1).game
    expect(next.world.tinOpen).toBe(false)
    expect(next.world.pieces.find((piece) => piece.id === trimmed.id)).toMatchObject({ blind: false })
    // A fruit that has not been cut carries no such mark, whenever it landed.
    expect(crate(short).game.world.pieces.at(-1)!.blind).toBe(true)
  })

  it('is mixed when the fruit was marked by the roller', () => {
    const landed = crate(start.game)
    const marked = { ...landed.game, world: roll(landed.game.world, landed.id, 2) }
    const result = cut(marked.world, landed.id, shareLength(start.game.window!.fruit, { num: 1, den: 2 }))
    if (result.kind !== 'cut') throw new Error('no cut')
    expect(give({ ...marked, world: result.world }, result.left, 0).given!.ending!.outcome).toBe('mixed')
  })

  it('goes badly, and the place steps down, when the child sends the customer off with a tin that holds a misfit', () => {
    const misfit = serve(placed(LADDER[3]), 500).game
    const sent = sendOff(misfit)
    expect(sent.ending).toMatchObject({ outcome: 'badly', result: { kind: 'over', by: 500 } })
    expect(sent.game.position).toBe(LADDER[2])
    expect(sent.game.finished).toBe(true)
    // A piece that sticks out is eaten sticking out.
    expect(inTin(sent.game.world, 0)).toEqual([])
    expect(eaten(sent.game.world)).toHaveLength(1)
  })

  it('moves the place only for the customer who carries the new thing of the place as it stands', () => {
    // One who carries nothing new.
    expect(serve(placed(LADDER[3], null)).game.position).toBe(LADDER[3])
    expect(sendOff(serve(placed(LADDER[3], null), 500).game).game.position).toBe(LADDER[3])
    // One laid out for the place before, who was still waiting when the place moved.
    expect(serve(placed(LADDER[3], LADDER[2])).game.position).toBe(LADDER[3])
    expect(sendOff(serve(placed(LADDER[3], LADDER[2]), 500).game).game.position).toBe(LADDER[3])
    expect(serve(placed(LADDER[3])).game.position).toBe(LADDER[4])
  })

  it('shows a new idea once, after the first piece is laid, and never again', () => {
    const first = serve(start.game)
    const again = call(first.game, 1)
    expect(serve(again.game).given).toMatchObject({ opened: true, firstShowing: null })
  })

  it('shuts the lid when a piece that stuck out is trimmed where it lies, and that is mixed', () => {
    const over = serve(start.game, 500).game
    const inside = inTin(over.world, 0)[0]
    expect(settle(over)).toEqual({ game: over, ending: null })
    const trimmed = cut(over.world, inside.id, inside.length - 500)
    if (trimmed.kind !== 'cut') throw new Error('no cut')
    const done = settle({ ...over, world: trimmed.world })
    expect(done.ending).toMatchObject({ outcome: 'mixed', result: { kind: 'fit' } })
    expect(done.game.finished).toBe(true)
    expect(settle(done.game).ending).toBeNull()
    expect(settle(freshGame(null)).ending).toBeNull()
  })

  it('gives a fresh fruit of the ordered kind, and of all three kinds over time when nobody has ordered', () => {
    expect(start.game.world.pieces.at(-1)).toBeDefined()
    const ordered = crate(start.game)
    expect(ordered.game.world.pieces.at(-1)!.fruit).toBe(start.game.window!.fruit)
    expect(ordered.game.seed).toBe(start.game.seed)
    let game = freshGame(null)
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const landed = crate(game)
      seen.add(landed.game.world.pieces.find((piece) => piece.id === landed.id)!.fruit)
      game = landed.game
    }
    expect(seen.size).toBe(3)
  })

  it('picks a piece of another fruit out of the tin', () => {
    const other = crate({ ...start.game, window: { ...start.game.window!, fruit: start.game.window!.fruit === 'short' ? 'long' : 'short' } })
    const done = give({ ...other.game, window: start.game.window }, other.id, 0)
    expect(done.given).toMatchObject({ strays: [other.id], result: { kind: 'empty' }, ending: null })
    expect(done.game.world.pieces.some((made) => made.id === other.id)).toBe(false)
    expect(done.game.world.tinOpen).toBe(true)
  })

  it('is mixed when the customer is fed by hand, whatever it was fed, and the piece goes inside the customer', () => {
    const made = cutFor(start.game, tinParts(start.game.window!)[0])
    const fed = feed(made.game, made.id)
    expect(fed.ending).toMatchObject({ outcome: 'mixed', glider: false, result: { kind: 'fit' } })
    expect(fed.game).toMatchObject({ finished: true, position: start.game.position })
    expect(eaten(fed.game.world).map((piece) => piece.id)).toEqual([made.id])
    const wrong = cutFor(start.game, tinParts(start.game.window!)[0], 700)
    expect(feed(wrong.game, wrong.id)).toMatchObject({ ending: { outcome: 'mixed', result: { kind: 'over' } }, game: { position: start.game.position } })
  })

  it('sets what lay in the tin on the shelf when the customer is fed by hand, so nothing is lost when the next one steps up', () => {
    // A piece too short lies in the tin; then the customer is fed another piece by hand.
    const short = cutFor(start.game, tinParts(start.game.window!)[0], -400)
    const laid = give(short.game, short.id, 0).game
    expect(inTin(laid.world, 0).map((piece) => piece.id)).toEqual([short.id])
    const other = cutFor(laid, 300)
    const fed = feed(other.game, other.id)
    expect(fed.ending).toMatchObject({ fed: true, glider: false })
    expect(fed.shelved).toEqual([short.id])
    expect(inTin(fed.game.world, 0)).toEqual([])
    expect(onShelf(fed.game.world).map((piece) => piece.id)).toContain(short.id)
    expect(eaten(fed.game.world).map((piece) => piece.id)).toEqual([other.id])
    // The next customer steps up: the piece is still on the shelf.
    expect(call(fed.game, 0).game.world.pieces.some((piece) => piece.id === short.id)).toBe(true)
    // An ending by the tin is not a feeding by hand.
    expect(serve(start.game).given!.ending).toMatchObject({ fed: false })
  })

  it('lets a customer that has been served eat another piece from the hand, with nothing more judged', () => {
    const served = serve(start.game).game
    const more = cutFor(served, 300)
    const fed = feed(more.game, more.id)
    expect(fed).toMatchObject({ ending: null, ate: true, game: { finished: true, position: served.position } })
    expect(eaten(fed.game.world).map((piece) => piece.id)).toEqual([...eaten(served.world).map((piece) => piece.id), more.id])
  })

  it('lets a served pelican leave as the glider too: what it had eaten goes with it, and nothing is left finished', () => {
    const served = serve(start.game).game
    expect(eaten(served.world)).toHaveLength(1)
    const whole = crate(served)
    const fed = feed(whole.game, whole.id)
    expect(fed.ending).toMatchObject({ glider: true, outcome: 'mixed' })
    expect(fed.game).toMatchObject({ window: null, finished: false, position: served.position, world: { tinOpen: false } })
    expect(eaten(fed.game.world)).toEqual([])
    expect(fed.game.world.pieces.some((left) => left.id === whole.id)).toBe(false)
  })

  it('lets the pelican leave with a whole fruit: the glider, every time, with the window left empty', () => {
    expect(start.game.window!.who).toBe('pelican')
    const misfit = serve(start.game, -400).game
    const inside = inTin(misfit.world, 0).map((piece) => piece.id)
    const whole = crate(misfit)
    const fed = feed(whole.game, whole.id)
    expect(fed.ending).toMatchObject({ outcome: 'mixed', glider: true })
    expect(fed.game).toMatchObject({ window: null, finished: false, position: start.game.position, world: { tinOpen: false } })
    expect(fed.game.world.pieces.some((left) => left.id === whole.id)).toBe(false)
    // What lay in its tin is set on the shelf, and the two still wait.
    expect(onShelf(fed.game.world).map((piece) => piece.id)).toEqual(expect.arrayContaining(inside))
    expect(fed.game.queue).toEqual(misfit.queue)
    expect(call(fed.game, 0).did).toBe('stepped')
  })
})

describe('the two who wait', () => {
  const start = call(freshGame(null), 0)

  it('change places with an unserved customer whose tin is empty, and nothing is judged', () => {
    const swapped = call(start.game, 1)
    expect(swapped.did).toBe('swapped')
    expect(swapped.game.window).toEqual(start.game.queue[1])
    expect(swapped.game.queue[1]).toEqual(start.game.window)
    expect(swapped.game.position).toBe(start.game.position)
    expect(swapped.game.seed).toBe(start.game.seed)
  })

  it('shut a tin that stood open and empty when they change places, and the one who steps back then moves nothing', () => {
    // A piece of the wrong fruit springs the tin open and is picked out: the tin is open and empty, and the truth has been shown.
    const other = crate({ ...start.game, window: { ...start.game.window!, fruit: start.game.window!.fruit === 'short' ? 'long' : 'short' } })
    const open = give({ ...other.game, window: start.game.window }, other.id, 0).game
    expect(open.world.tinOpen).toBe(true)
    expect(open.window!.carries).toBe(LADDER[0])
    const swapped = call(open, 1)
    expect(swapped.did).toBe('swapped')
    expect(swapped.game.world.tinOpen).toBe(false)
    expect(swapped.game.queue[1]).toEqual({ ...open.window!, carries: null })
    // Called back and served well, with the tin shut again: the position stays where it was.
    const back = call(swapped.game, 1).game
    expect(back.window!.carries).toBeNull()
    expect(serve(back).game.position).toBe(LADDER[0])
    // A change of places with a tin that never opened leaves the customer as it was.
    expect(call(start.game, 1).game.queue[1]).toEqual(start.game.window)
  })

  it('send the customer at the window off first when its tin holds something', () => {
    const misfit = serve(start.game, 600).game
    const touched = call(misfit, 0)
    expect(touched.did).toBe('sentOff')
    expect(touched.ending!.outcome).toBe('badly')
    expect(touched.game.window).toEqual(misfit.window)
  })

  it('were laid out before the cycle was judged: a new place shows on the one who joins after', () => {
    const served = serve({ ...start.game, position: 'carried', window: { ...start.game.window!, carries: 'carried' } })
    expect(served.game.position).toBe('written')
    expect(served.game.queue.every((customer) => !customer.written)).toBe(true)
    const next = call(served.game, 0)
    expect(next.game.window!.written).toBe(false)
    expect(next.game.queue[0]).toMatchObject({ written: true, carries: 'written' })
    expect(next.game.queue[1].written).toBe(false)
  })

  it('move nothing when the one still waiting carries the new thing of the place before', () => {
    const moved = serve(start.game).game
    expect(moved.position).toBe(LADDER[1])
    const waiting = call(moved, 0).game
    expect(waiting.window!.carries).toBe(LADDER[0])
    expect(serve(waiting).game.position).toBe(LADDER[1])
    // The one who joined as the first was served carries the new thing of the place as it now stands.
    expect(waiting.queue[0].carries).toBe(LADDER[1])
  })

  it('eat a piece given to them there and then: it is gone, nothing is judged, and they go on waiting', () => {
    const made = cutFor(start.game, 500)
    const given = treat(made.game, 1, made.id)
    expect(given.glider).toBe(false)
    expect(given.game.world.pieces.some((piece) => piece.id === made.id)).toBe(false)
    expect(given.game).toMatchObject({ queue: made.game.queue, window: made.game.window, position: made.game.position, finished: false, seed: made.game.seed })
    expect(treat(made.game, 0, 999)).toEqual({ game: made.game, glider: false })
  })

  it('lose a pelican to the glider when it is given a whole fruit, and another customer joins in its place', () => {
    expect(start.game.queue[1].who).toBe('pelican')
    const whole = crate(start.game)
    const given = treat(whole.game, 1, whole.id)
    expect(given.glider).toBe(true)
    expect(given.game.world.pieces.some((piece) => piece.id === whole.id)).toBe(false)
    expect(given.game.queue[0]).toEqual(whole.game.queue[0])
    expect(inRange(given.game.queue[1])).toEqual([])
    expect(given.game.queue[1].carries).toBe(whole.game.queue[1].carries)
    expect(given.game.seed).not.toBe(whole.game.seed)
    expect(given.game.window).toEqual(whole.game.window)
  })

  it('lick off a piece flung at them: it is gone and nothing else changes', () => {
    const made = cutFor(start.game, 500)
    const after = splat(made.game, made.id)
    expect(after.world.pieces.some((piece) => piece.id === made.id)).toBe(false)
    expect({ ...after, world: made.game.world }).toEqual(made.game)
    expect(splat(made.game, 999)).toBe(made.game)
  })

  it('take the served customer, what it ate and its tin away when one steps up, and the counter keeps the rest', () => {
    const served = serve(start.game)
    const before = served.game.world.pieces.filter((made) => made.place.on !== 'tin' && made.place.on !== 'eaten').map((made) => made.id)
    const next = call(served.game, 1)
    expect(next.game.finished).toBe(false)
    expect(next.game.world.pieces.map((made) => made.id)).toEqual(before)
    expect(eaten(next.game.world)).toEqual([])
    expect(next.game.world.tinOpen).toBe(false)
  })
})

describe('a customer fed again and again', () => {
  it('keeps no more inside it than the rail could hold, so the save stays inside its bound however long the child goes on', () => {
    let game = serve(call(freshGame(null), 0).game).game
    expect(game.finished).toBe(true)
    for (let i = 0; i < 3 * MOST_EATEN; i++) {
      const made = cutFor(game, 100)
      game = feed(made.game, made.id).game
      // What is left of each fruit goes to the dog, as a child tidying up would send it: only what is eaten piles up.
      game = { ...game, world: { ...game.world, pieces: game.world.pieces.filter((piece) => piece.place.on === 'eaten') } }
    }
    expect(eaten(game.world)).toHaveLength(MOST_EATEN)
    expect(eaten(game.world).map((piece) => (piece.place.on === 'eaten' ? piece.place.turn : -1))).toEqual([...Array(MOST_EATEN).keys()])
    expect(game.world.pieces.length).toBeLessThanOrEqual(MOST_PIECES)
    expect(JSON.stringify(serialize(game)).length).toBeLessThan(32 * 1024)
    expect(serialize(deserialize(JSON.parse(JSON.stringify(serialize(game)))))).toEqual(serialize(game))
  })
})

describe('a first showing', () => {
  it('plays for every idea the first time it is met, also after a first visit that starts further up the designed order', () => {
    let game = freshGame(11)
    expect(game.position).toBe('written')
    expect(game.shown).toEqual([])
    const metFirst: Record<string, boolean> = {}
    for (let i = 0; i < 120 && !(metFirst.twins && metFirst.ants); i++) {
      game = call(game, (i % 2) as 0 | 1).game
      const who = game.window!.who, idea = who === 'twins' ? 'shared' : who === 'ants' ? 'carried' : null
      const before = game.shown
      // The first piece laid in the tin opens it, and every idea of this customer not yet shown is shown and marked.
      const made = cutFor(game, tinParts(game.window!)[0])
      const first = give(made.game, made.id, 0)
      if (idea && !before.includes(idea)) {
        expect(first.given!.firstShowing, `${who}, cycle ${i}`).not.toBeNull()
        expect(first.game.shown).toContain(idea)
        metFirst[who] = true
      }
      for (const id of ideasOf(game.window!)) expect(first.game.shown, `${who}, cycle ${i}`).toContain(id)
      expect(new Set(first.game.shown).size).toBe(first.game.shown.length)
      game = first.game.finished ? first.game : serve(game).game
    }
    expect(metFirst).toEqual({ twins: true, ants: true })
  })

  it('is one idea at a time in the designed order: nothing but the new position is marked', () => {
    let game = freshGame(null)
    for (let i = 0; i < 40; i++) {
      game = call(game, 0).game
      const before = game.shown.length
      game = serve(game).game
      expect(game.shown.length - before).toBeLessThanOrEqual(1)
    }
  })
})

describe('a full shelf', () => {
  /** The game with four whole fruits on the shelf, oldest first. */
  function fullShelf(from: Game): { game: Game; ids: number[] } {
    let game = from
    const ids: number[] = []
    for (let i = 0; i < 4; i++) {
      const landed = crate(game)
      game = { ...landed.game, world: setOnShelf(landed.game.world, landed.id).world }
      ids.push(landed.id)
    }
    return { game, ids }
  }
  const start = call(freshGame(null), 0)

  it('says what a piece that slides off the end of the rail pushes off the shelf, so that it can be seen going to the dog', () => {
    let { game, ids } = fullShelf(start.game)
    // Whole fruits are laid in the tin until one would run past the end of the rail.
    let slid: ReturnType<typeof give>['given'] = null
    for (let i = 0; i < 4 && !slid?.slidOff; i++) {
      const landed = crate(game)
      const done = give(landed.game, landed.id, 0)
      game = done.game
      slid = done.given
    }
    expect(slid).toMatchObject({ slidOff: true, fell: [ids[0]] })
    expect(game.world.pieces.some((piece) => piece.id === ids[0])).toBe(false)
  })

  it('lets nothing lie past the end of the rail: where the pieces end is what counts, not how much is in the tin', () => {
    // The twins order a whole long fruit: two compartments of half a fruit each. An uncut long fruit laid in the second would end far past the rail.
    const twins: Customer = { who: 'twins', fruit: 'long', shares: [{ num: 2, den: 2 }], carries: null, written: true, lined: true }
    const game: Game = { ...start.game, window: twins }
    const landed = crate(game)
    const second = give(landed.game, landed.id, 1)
    expect(second.given).toMatchObject({ slidOff: true })
    expect(inTin(second.game.world, 1)).toEqual([])
    // In the first compartment it ends inside the rail, and stays.
    const first = give(landed.game, landed.id, 0)
    expect(first.given).toMatchObject({ slidOff: false })
  })

  it('says what the pieces left in a hand-fed customer\'s tin push off the shelf', () => {
    const { game } = fullShelf(start.game)
    const short = cutFor(game, tinParts(game.window!)[0], -400)
    const laid = give(short.game, short.id, 0).game
    const other = cutFor(laid, 300)
    expect(onShelf(other.game.world)).toHaveLength(4)
    const oldest = onShelf(other.game.world)[0].id
    const fed = feed(other.game, other.id)
    expect(fed.shelved).toEqual([short.id])
    expect(fed.fell).toEqual([oldest])
  })
})

describe('a row fed by hand', () => {
  it('is one serving: every piece of it is eaten, and the body makes of it what it makes of exactly those pieces', () => {
    const start = call(freshGame(null), 0)
    expect(start.game.window!.who).toBe('pelican')
    // Two pieces fed together are a seam: a lump and a hiccup, not one smooth bulge.
    const one = cutFor(start.game, 300)
    const two = cutFor(one.game, 300)
    const fed = feed(two.game, one.id, [two.id])
    expect(fed).toMatchObject({ ate: true, ending: { fed: true, outcome: 'mixed', taste: { who: 'pelican', liked: false, hiccups: 1, lumps: [300, 300] } } })
    expect(eaten(fed.game.world).map((piece) => piece.id)).toEqual([one.id, two.id])
    // One piece alone is still one bulge.
    expect(feed(two.game, one.id).ending).toMatchObject({ taste: { liked: true, hiccups: 0 } })
    // The boa sneezes for every crumb in a row it is fed.
    const boa: Customer = { who: 'boa', fruit: 'long', shares: [{ num: 5, den: 4 }], carries: null, written: true, lined: true }
    const game: Game = { ...start.game, window: boa }
    const crumbs = [cutFor(game, 100)]
    crumbs.push(cutFor(crumbs[0].game, 100))
    crumbs.push(cutFor(crumbs[1].game, 100))
    const sneezed = feed(crumbs[2].game, crumbs[0].id, [crumbs[1].id, crumbs[2].id])
    expect(sneezed.ending).toMatchObject({ taste: { who: 'boa', liked: false, sneezes: 3 } })
    expect(eaten(sneezed.game.world)).toHaveLength(3)
  })
})

describe('a piece taken from the oldest row of a full shelf', () => {
  it('is eaten by the customer it is fed to, and is not what the tin\'s pieces push off the shelf', () => {
    const start = call(freshGame(null), 0)
    // A short piece lies in the tin; then the shelf is filled.
    const short = cutFor(start.game, tinParts(start.game.window!)[0], -400)
    let game = give(short.game, short.id, 0).game
    while (onShelf(game.world).length < SHELF) {
      const landed = crate(game)
      game = { ...landed.game, world: setOnShelf(landed.game.world, landed.id).world }
    }
    // The child takes the piece in the oldest row, the one that would be the next to drop, and feeds it to the customer.
    const mine = onShelf(game.world)[0]
    expect(mine.fruit).toBe(game.window!.fruit)
    const fed = feed(game, mine.id)
    expect(fed).toMatchObject({ ate: true, shelved: [short.id], fell: [] })
    expect(eaten(fed.game.world).map((piece) => piece.id)).toEqual([mine.id])
    expect(onShelf(fed.game.world)).toHaveLength(SHELF)
    expect(onShelf(fed.game.world).map((piece) => piece.id)).toContain(short.id)
  })
})

describe('who joins the queue', () => {
  it('carries what is new unless the one it joins already does, so known work keeps coming back and one who waits always carries the new thing', () => {
    for (const seed of [3, 11, 2026]) {
      let game = freshGame(null, seed)
      let known = 0, fresh = 0
      for (let i = 0; i < 60; i++) {
        const index = (i % 3 === 0 ? 1 : 0) as 0 | 1
        const other = game.queue[index === 0 ? 1 : 0]
        const position = game.position
        game = call(game, index).game
        const joined = game.queue[index]
        // The one it joins carries the new thing of the position as it stands: then it is known work. Otherwise it brings the new thing.
        if (LADDER.indexOf(position) > 0) expect(joined.carries, `seed ${seed}, cycle ${i}`).toBe(other.carries === position ? null : position)
        expect(game.queue.some((customer) => customer.carries === game.position), `seed ${seed}, cycle ${i}`).toBe(true)
        if (joined.carries === null) known++
        else fresh++
        game = serve(game).game
      }
      expect(known, `seed ${seed}`).toBeGreaterThan(10)
      expect(fresh, `seed ${seed}`).toBeGreaterThan(10)
    }
  })

  it('never leaves the position with nobody to move it: after a customer steps back from an open tin carrying nothing, the next to join brings the new thing', () => {
    let game = call(freshGame(null), 0).game
    // The tin springs open for a piece of the wrong fruit, which is picked out: open and empty.
    const wrong = crate({ ...game, window: { ...game.window!, fruit: game.window!.fruit === 'short' ? 'long' : 'short' } })
    game = give({ ...wrong.game, window: game.window }, wrong.id, 0).game
    game = call(game, 1).game
    expect(game.queue[1].carries).toBeNull()
    // However the child goes on from here, somebody who can move the position is always within one call.
    for (let i = 0; i < 12; i++) {
      game = serve(game).game
      game = call(game, (i % 2) as 0 | 1).game
      expect([game.window!, ...game.queue].some((customer) => customer.carries === game.position), `cycle ${i}`).toBe(true)
    }
    // And the position does move again.
    let moved = false
    const from = game.position
    for (let i = 0; i < 12 && !moved; i++) {
      game = serve(game).game
      moved = game.position !== from
      game = call(game, game.queue[0].carries === game.position ? 0 : 1).game
    }
    expect(moved).toBe(true)
  })
})

describe('many visits', () => {
  it('walk the whole designed order one step at a time when every first cut fits, with every customer in range', () => {
    let game = freshGame(null)
    const seen: string[] = [game.position]
    for (let i = 0; i < 80 && game.position !== LADDER[LADDER.length - 1]; i++) {
      game = call(game, 0).game
      expect(inRange(game.window!)).toEqual([])
      const before = LADDER.indexOf(game.position)
      const carried = game.window!.carries === game.position
      game = serve(game).game
      expect(game.finished).toBe(true)
      expect(LADDER.indexOf(game.position) - before).toBe(carried ? 1 : 0)
      if (seen[seen.length - 1] !== game.position) seen.push(game.position)
      expect(game.world.pieces.length).toBeLessThan(40)
    }
    expect(seen).toEqual([...LADDER])
    expect(new Set(game.shown).size).toBe(game.shown.length)
  })

  it('never reads a clock and never leaves the ladder, however badly things go', () => {
    let game: Game = { ...freshGame(null), position: LADDER[2] }
    for (let i = 0; i < 12; i++) {
      game = call(game, 0).game
      game = sendOff(serve(game, 3 * giveOf(game.window!.fruit)).game).game
      expect(LADDER).toContain(game.position)
    }
    expect(game.position).toBe(LADDER[0])
    expect(WHOLE.long).toBe(2400)
  })
})
