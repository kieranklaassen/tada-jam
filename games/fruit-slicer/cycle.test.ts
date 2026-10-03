import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { call, crate, feed, freshGame, give, judge, sendOff, type Game } from './cycle'
import { WHOLE, giveOf, shareLength } from './measure'
import { inRange, tinParts, type Customer } from './orders'
import { serveOf } from './serve'
import { cut, eaten, inTin, isWhole, onLane, onShelf, roll, type Piece } from './world'

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
const piece = (length: number, over: Partial<Piece> = {}): Piece => ({ id: 1, fruit: 'long', length, place: { on: 'tin', part: 0, turn: 0 }, blind: true, ruled: 0, ...over })

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
    expect(feed(game, id)).toEqual({ game, ending: null })
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
