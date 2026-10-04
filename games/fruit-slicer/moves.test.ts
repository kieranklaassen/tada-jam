import { describe, expect, it } from 'vitest'
import { call, freshGame, give, type Game } from './cycle'
import { FRUITS, WHOLE, giveOf } from './measure'
import { tinParts } from './orders'
import { BOARD, COUNTER, CRATE, DOG, LANE_H, PX, QUEUE, RAIL_BOX, ROLLER, SHELF_BOX, SHUT_TIN, TIN, WALL, WINDOW, X0, laneTop, rowTop, type Box, type Point } from './stage'
import { holdsMisfit, newStroke, poke, slice, tinAt, touches, type GameEvent } from './moves'
import { SHELF, cut, inTin, onLane, onShelf, setOnShelf } from './world'

const game = freshGame(null)
const NEAR = laneTop(0) + LANE_H / 2
const mid = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
/** A stroke straight down through the near lane at `points` along the board. */
const down = (points: number): [Point, Point] => [{ x: X0 + points * PX, y: NEAR - 60 }, { x: X0 + points * PX, y: NEAR + 60 }]
const kinds = (events: GameEvent[]) => events.map((event) => event.kind)
const total = (g: Game) => g.world.pieces.reduce((sum, piece) => sum + piece.length, 0)

describe('a stroke', () => {
  it('cuts the fruit square where it crosses its middle line, whatever the angle', () => {
    const straight = slice(game, ...down(600), newStroke())
    expect(straight.events).toHaveLength(1)
    expect(straight.events[0]).toMatchObject({ kind: 'cut', length: WHOLE.long, voice: 'thwack', fruit: 'long', y: NEAR })
    expect(onLane(straight.game.world, 0).map((piece) => piece.length)).toEqual([600, 1800])
    // A slanted stroke that crosses the middle line at the same place makes the same two pieces.
    const slanted = slice(game, { x: X0 + 600 * PX - 80, y: NEAR - 40 }, { x: X0 + 600 * PX + 80, y: NEAR + 40 }, newStroke())
    expect(onLane(slanted.game.world, 0).map((piece) => piece.length)).toEqual([600, 1800])
    expect(total(straight.game)).toBe(WHOLE.long)
  })

  it('cuts once when a step of the stroke ends exactly on the middle line', () => {
    const x = X0 + 600 * PX
    const first = slice(game, { x, y: NEAR - 40 }, { x, y: NEAR }, newStroke())
    expect(first.stroke.cuts).toBe(1)
    const second = slice(first.game, { x, y: NEAR }, { x, y: NEAR + 40 }, first.stroke)
    expect(second.stroke.cuts).toBe(1)
    // And coming up from below, the same.
    const up = slice(game, { x, y: NEAR + 40 }, { x, y: NEAR }, newStroke())
    expect(slice(up.game, { x, y: NEAR }, { x, y: NEAR - 40 }, up.stroke).stroke.cuts).toBe(1)
  })

  it('does nothing to a fruit it does not cross', () => {
    const beside = slice(game, { x: X0 + 100, y: NEAR - 80 }, { x: X0 + 300, y: NEAR - 40 }, newStroke())
    expect(beside.events).toEqual([])
    expect(beside.game).toEqual(game)
    const past = slice(game, ...down(WHOLE.long + 200), newStroke())
    expect(past.events).toEqual([])
    expect(past.stroke.travelled).toBe(120)
    expect(past.stroke.cuts).toBe(0)
  })

  it('cuts a piece again with a higher voice, and counts its cuts', () => {
    const first = slice(game, ...down(1200), newStroke())
    const second = slice(first.game, ...down(600), newStroke())
    expect(second.events[0]).toMatchObject({ kind: 'cut', length: 1200, voice: 'snick' })
    expect(onLane(second.game.world, 0).map((piece) => piece.length)).toEqual([600, 600, 1200])
    expect(second.stroke.cuts).toBe(1)
  })

  it('cuts each piece once however the finger wanders back and forth', () => {
    let state = { game, stroke: newStroke(), events: [] as GameEvent[] }
    const [a, b] = down(600)
    for (let i = 0; i < 6; i++) state = slice(state.game, i % 2 ? b : a, i % 2 ? a : b, state.stroke)
    expect(state.game.world.pieces).toHaveLength(2)
    expect(state.stroke.cuts).toBe(1)
  })

  it('too near an end takes a curl of peel and leaves the fruit whole', () => {
    const result = slice(game, ...down(giveOf('long') / 2), newStroke())
    expect(result.events).toEqual([expect.objectContaining({ kind: 'curl', voice: 'curl', fruit: 'long' })])
    expect(result.game.world).toEqual(game.world)
  })

  it('cuts every piece it crosses in one go, in the order the blade meets them', () => {
    // A second fruit on the far lane, and one on the shelf: one long stroke down through all three.
    const two = poke(game, mid(CRATE)).game
    const three = poke(two, mid(CRATE)).game
    const shelved = { ...three, world: setOnShelf(three.world, onLane(three.world, 1)[0].id).world }
    const again = poke(shelved, mid(CRATE)).game
    const x = X0 + 300 * PX
    const result = slice(again, { x, y: BOARD.y - 20 }, { x, y: rowTop(0) + 50 }, newStroke())
    const cuts = result.events.filter((event) => event.kind === 'cut')
    expect(cuts).toHaveLength(3)
    expect(cuts.map((event) => (event.kind === 'cut' ? event.y : 0))).toEqual([...cuts.map((event) => (event.kind === 'cut' ? event.y : 0))].sort((p, q) => p - q))
    expect(result.stroke.cuts).toBe(3)
    expect(total(result.game)).toBe(total(again))
  })

  it('through the crate splits a slat once, and one fruit of each kind tumbles out', () => {
    const through: [Point, Point] = [{ x: CRATE.x - 20, y: CRATE.y + 40 }, { x: CRATE.x + CRATE.w + 20, y: CRATE.y + 60 }]
    const result = slice(game, ...through, newStroke())
    expect(kinds(result.events).filter((kind) => kind === 'spill')).toHaveLength(1)
    const landed = result.events.filter((event) => event.kind === 'land')
    expect(landed.map((event) => (event.kind === 'land' ? event.fruit : ''))).toEqual([...FRUITS])
    expect(kinds(result.events)).toContain('swept')
    expect(slice(result.game, through[1], through[0], result.stroke).events).toEqual([])
  })

  it('past the dog makes it snap, once', () => {
    const result = slice(game, { x: DOG.x - 10, y: DOG.y + 50 }, { x: DOG.x + 60, y: DOG.y + 60 }, newStroke())
    expect(result.events).toEqual([expect.objectContaining({ kind: 'snap', voice: 'chomp' })])
    expect(slice(result.game, { x: DOG.x + 60, y: DOG.y + 60 }, { x: DOG.x + 90, y: DOG.y + 70 }, result.stroke).events).toEqual([])
  })

  it('touches a box when it passes through it, ends in it, or starts in it, and not when it passes by', () => {
    const box = { x: 0, y: 0, w: 10, h: 10 }
    expect(touches({ x: -5, y: 5 }, { x: 15, y: 5 }, box)).toBe(true)
    expect(touches({ x: 5, y: 5 }, { x: 6, y: 6 }, box)).toBe(true)
    expect(touches({ x: -5, y: -5 }, { x: 5, y: 5 }, box)).toBe(true)
    expect(touches({ x: -5, y: 12 }, { x: 15, y: 12 }, box)).toBe(false)
    expect(touches({ x: -5, y: 5 }, { x: -1, y: 5 }, box)).toBe(false)
    expect(touches({ x: 5, y: 5 }, { x: 5, y: 5 }, box)).toBe(true)
  })
})

describe('a tap', () => {
  it('makes a fruit quiver and a piece ring, and changes nothing', () => {
    const at = { x: X0 + 100, y: NEAR }
    expect(poke(game, at)).toEqual({ game, events: [expect.objectContaining({ kind: 'poke', voice: 'quiver', length: WHOLE.long })] })
    const cutGame = slice(game, ...down(600), newStroke()).game
    expect(poke(cutGame, at).events).toEqual([expect.objectContaining({ kind: 'poke', voice: 'pluck', length: 600 })])
    expect(poke(cutGame, at).game).toEqual(cutGame)
  })

  it('on the crate drops a fresh fruit on the board, as often as the child likes, in all three kinds over time', () => {
    let state = game
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const result = poke(state, mid(CRATE))
      const landed = result.events.find((event) => event.kind === 'land')!
      expect(landed).toMatchObject({ voice: 'thump' })
      if (landed.kind === 'land') seen.add(landed.fruit)
      state = result.game
      expect(onShelf(state.world).length).toBeLessThanOrEqual(SHELF)
      expect(onLane(state.world, 0).length + onLane(state.world, 1).length).toBeGreaterThan(0)
    }
    expect(seen.size).toBe(3)
  })

  it('shoves the far lane onto the shelf, and what drops off the shelf goes to the dog with where it was', () => {
    let state = game
    const fell: GameEvent[] = []
    for (let i = 0; i < 12; i++) {
      const result = poke(state, mid(CRATE))
      fell.push(...result.events.filter((event) => event.kind === 'fell'))
      state = result.game
    }
    expect(fell.length).toBeGreaterThan(0)
    for (const event of fell) {
      if (event.kind !== 'fell') continue
      expect(event.voice).toBe('munch')
      expect(event.from.y).toBeGreaterThanOrEqual(SHELF_BOX.y)
      expect(state.world.pieces.some((piece) => piece.id === event.piece.id)).toBe(false)
    }
  })

  it('makes the dog bark, and anything bare answers with a knock', () => {
    expect(poke(game, mid(DOG)).events).toEqual([{ kind: 'bark', voice: 'bark' }])
    expect(poke(game, { x: X0 + 2700 * PX, y: NEAR }).events).toEqual([expect.objectContaining({ kind: 'knock', on: 'board' })])
    expect(poke(game, mid(SHELF_BOX)).events).toEqual([expect.objectContaining({ kind: 'knock', on: 'shelf' })])
    expect(poke(game, mid(WINDOW)).events).toEqual([expect.objectContaining({ kind: 'knock', on: 'wall' })])
    expect(poke(game, mid(ROLLER)).events).toEqual([expect.objectContaining({ kind: 'knock', on: 'roller' })])
    expect(WALL.h).toBeGreaterThan(0)
    expect(poke(game, { x: COUNTER.x + 20, y: COUNTER.y + 20 }).events).toEqual([expect.objectContaining({ kind: 'knock', on: 'counter' })])
    expect(poke(game, { x: -50, y: -50 })).toEqual({ game, events: [] })
  })
})

describe('the toy as a whole', () => {
  it('never loses fruit except to the dog, and never leaves the place in the designed order', () => {
    let state = game
    let eatenByDog = 0, landedTotal = WHOLE.long
    for (let i = 0; i < 200; i++) {
      const x = X0 + ((i * 137) % 2600) * PX
      const result = i % 7 === 0 ? poke(state, mid(CRATE)) : slice(state, { x, y: BOARD.y - 30 }, { x: x + 40, y: SHELF_BOX.y + SHELF_BOX.h + 20 }, newStroke())
      for (const event of result.events) {
        if (event.kind === 'fell') eatenByDog += event.piece.length
        if (event.kind === 'land') landedTotal += event.length
      }
      state = result.game
    }
    expect(total(state) + eatenByDog).toBe(landedTotal)
    expect(state.position).toBe(game.position)
    expect(state.window).toBeNull()
    expect(state.finished).toBe(false)
  })
})

describe('with a customer at the window', () => {
  const start = call(game, 0).game
  const ordered = tinParts(start.window!)[0]
  /** The fruit on the board cut `off` points longer than the order, and the left part laid in the tin. */
  function served(off: number): Game {
    const fruit = onLane(start.world, 0)[0]
    const made = cut(start.world, fruit.id, ordered + off)
    if (made.kind !== 'cut') throw new Error('no cut')
    return give({ ...start, world: made.world }, made.left, 0).game
  }
  const tinMid = { x: X0 + 40, y: TIN.bodyY + TIN.bodyH / 2 }

  it('has a tin on the rail: folded small while it is shut, exactly as long as the order once it is open, and lifted off once the customer is served', () => {
    const shut = tinAt(start)!
    expect(shut.open).toBe(false)
    expect(shut.body.w).toBe(SHUT_TIN)
    expect(shut.body.w).not.toBeCloseTo(ordered * PX + 16)
    const open = tinAt(served(-400))!
    expect(open.open).toBe(true)
    expect(open.parts).toEqual([{ x: X0, w: ordered * PX }])
    expect(open.body.y).toBeGreaterThanOrEqual(RAIL_BOX.y)
    expect(open.ruler.y + open.ruler.h).toBeLessThanOrEqual(RAIL_BOX.y + RAIL_BOX.h)
    expect(tinAt(served(0))).toBeNull()
    expect(tinAt(game)).toBeNull()
  })

  it('trims a piece where it lies in the tin, and the lid shuts by itself when it then fits', () => {
    const over = served(400)
    expect(holdsMisfit(over)).toBe(true)
    const x = X0 + ordered * PX
    const result = slice(over, { x, y: TIN.bodyY - 10 }, { x, y: TIN.bodyY + TIN.bodyH + 10 }, newStroke())
    expect(kinds(result.events)).toEqual(['cut', 'ending'])
    const ending = result.events[1]
    expect(ending).toMatchObject({ kind: 'ending', how: 'shut', ending: { outcome: 'mixed' } })
    expect(result.game.finished).toBe(true)
    expect(inTin(result.game.world, 0)).toEqual([])
    expect(onShelf(result.game.world).map((piece) => piece.length)).toContain(400)
    expect(holdsMisfit(result.game)).toBe(false)
  })

  it('skids off the tin with sparks, once, where no piece lies under the blade', () => {
    const result = slice(start, { x: X0 + 40, y: TIN.bodyY - 10 }, { x: X0 + 40, y: TIN.bodyY + TIN.bodyH + 10 }, newStroke())
    // Shut and folded small, the tin rings one low note whatever the order: it does not give the order's length away by ear.
    expect(result.events).toEqual([expect.objectContaining({ kind: 'skid', voice: 'skid', length: WHOLE.long })])
    expect(result.game).toEqual(start)
    // Open, it rings at the pitch of the order's length.
    const open = { ...start, world: { ...start.world, tinOpen: true } }
    expect(slice(open, { x: X0 + 40, y: TIN.bodyY - 10 }, { x: X0 + 40, y: TIN.bodyY + TIN.bodyH + 10 }, newStroke()).events).toEqual([expect.objectContaining({ kind: 'skid', length: ordered })])
    expect(slice(start, { x: X0 + 60, y: TIN.bodyY + 70 }, { x: X0 + 60, y: TIN.bodyY - 10 }, result.stroke).events).toEqual([])
  })

  it('snips a tuft off each customer it passes, once each, and changes nothing', () => {
    const across = slice(start, { x: WINDOW.x + 5, y: WINDOW.y + 60 }, { x: QUEUE[1].x + 100, y: WINDOW.y + 80 }, newStroke())
    expect(across.events.map((event) => (event.kind === 'snip' ? event.whom : event.kind))).toEqual(['window', 0, 1])
    expect(across.game).toEqual(start)
    // With nobody at the window there is nobody there to snip.
    expect(kinds(slice(game, { x: WINDOW.x + 5, y: WINDOW.y + 60 }, { x: WINDOW.x + 200, y: WINDOW.y + 80 }, newStroke()).events)).toEqual([])
  })

  it('rattles the shut tin and snaps the jaw of the open one', () => {
    expect(poke(start, tinMid).events).toEqual([{ kind: 'tinPoke', open: false, voice: 'rattle' }])
    const open = served(-400)
    const gap = { x: X0 + ordered * PX - 20, y: tinMid.y }
    expect(poke(open, gap).events).toEqual([{ kind: 'tinPoke', open: true, voice: 'castanet' }])
    expect(poke(open, tinMid).events).toEqual([expect.objectContaining({ kind: 'poke', voice: 'pluck' })])
  })

  it('makes the customer at the window flinch, and take its order as it is when its tin holds a misfit', () => {
    expect(poke(start, mid(WINDOW))).toEqual({ game: start, events: [{ kind: 'flinch', whom: 'window', voice: 'babble' }] })
    const result = poke(served(-400), mid(WINDOW))
    expect(kinds(result.events)).toEqual(['flinch', 'ending'])
    expect(result.events[1]).toMatchObject({ how: 'sentOff', ending: { outcome: 'badly' } })
    expect(result.game.finished).toBe(true)
    expect(kinds(poke(result.game, mid(WINDOW)).events)).toEqual(['flinch'])
  })

  it('makes one who waits flinch and step up, or change places, or send the one at the window off first', () => {
    const first = poke(game, mid(QUEUE[0]))
    expect(first.events).toEqual([{ kind: 'flinch', whom: 0, voice: 'babble' }, { kind: 'called', index: 0, did: 'stepped' }])
    expect(first.game.window).toEqual(game.queue[0])
    expect(poke(start, mid(QUEUE[1])).events[1]).toEqual({ kind: 'called', index: 1, did: 'swapped' })
    const sent = poke(served(-400), mid(QUEUE[1]))
    expect(sent.events[1]).toMatchObject({ kind: 'ending', how: 'sentOff' })
    expect(poke(sent.game, mid(QUEUE[1])).events[1]).toEqual({ kind: 'called', index: 1, did: 'stepped' })
  })

  it('drops the ordered kind of fruit from the crate', () => {
    for (let i = 0; i < 5; i++) {
      const landed = poke(start, mid(CRATE)).events.find((event) => event.kind === 'land')!
      expect(landed).toMatchObject({ fruit: start.window!.fruit })
    }
  })
})
