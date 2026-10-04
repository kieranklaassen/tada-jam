import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { CUP_HOLDS } from './forms'
import { callPot, carry, pickUp, pressPot, putDown, releasePot } from './hands'
import { LIFT_AFTER, dueShowing, markShown, nextSitting, openGame, placeOf, stored, tick, type Game, type GameEvent } from './host'
import { TRAY } from './layout'
import { freshTeaState, serializeTea, type TeaState } from './save'
import { spill, thingById, type GuestId } from './world'

/** Plays `seconds` at 60 frames a second and returns everything that happened. */
function play(game: Game, seconds: number, busy: ReadonlySet<GuestId> = new Set()): GameEvent[] {
  const events: GameEvent[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...tick(game, 1 / 60, busy))
  return events
}

/** Calls the pot to a cup, holds it for `seconds`, lets go, and waits for the guest. */
function pour(game: Game, cup: string, seconds: number): GameEvent[] {
  callPot(game, { id: cup, guest: null, spot: thingById(game.world, cup)! })
  const events = play(game, 0.6)
  pressPot(game)
  events.push(...play(game, seconds))
  releasePot(game)
  events.push(...play(game, LIFT_AFTER + 0.8))
  return events
}

const lifts = (events: GameEvent[]) => events.filter((event) => event.type === 'lift')
const at = (position: string, over: Partial<TeaState> = {}): Game => {
  const tea = { ...freshTeaState(null), position, finished: true, ...over }
  const game = openGame(JSON.parse(JSON.stringify(serializeTea(tea))), null)
  expect(nextSitting(game)).toBe(true)
  // The pot hops to the first cup of the new table: it has landed before anything is tried.
  for (let i = 0; i < 30; i++) tick(game, 1 / 60)
  return game
}

describe('a first visit', () => {
  it('opens on the Bear at a laid place, with the tools still in the tray and nothing happening by itself', () => {
    const game = openGame(null, null)
    expect(game.tea.position).toBe('brim')
    expect(game.tea.guests.map((guest) => guest.who)).toEqual(['bear'])
    expect(thingById(game.world, 'cup-bear')!.on).toMatch(/^saucer-/)
    expect(thingById(game.world, 'sponge')).toBeUndefined()
    expect(thingById(game.world, 'bowl')).toBeUndefined()
    expect(game.away.map((thing) => thing.kind).sort()).toEqual(['bowl', 'sponge'])
    expect(play(game, 5)).toEqual([])
    expect(dueShowing(game)).toBe('pour')
    markShown(game, 'pour')
    expect(dueShowing(game)).toBe(null)
  })

  it('takes the visit\'s seed only for a table that was never played', () => {
    expect(openGame(null, null, 12345).tea.seed).toBe(12345)
    const saved = stored(openGame(null, null))
    expect(openGame(JSON.parse(JSON.stringify(saved)), null, 12345).tea.seed).toBe(saved.seed)
  })
})

describe('a sitting', () => {
  it('ends when the Bear has drunk a brimful cup, moves the position on and lays out the next party', () => {
    const game = openGame(null, null)
    const events = pour(game, 'cup-bear', 4.4)
    const lift = lifts(events)[0]
    expect(lift).toMatchObject({ type: 'lift', who: 'bear', cup: 'cup-bear' })
    expect(lift.type === 'lift' && lift.lift.taste).toBe('right')
    expect(lift.type === 'lift' && lift.had).toBeGreaterThan(0.85)
    expect(thingById(game.world, 'cup-bear')!.tea).toBe(0)
    expect(events.filter((event) => event.type === 'ended')).toEqual([{ type: 'ended', outcome: 'well' }])
    expect(game.tea.finished).toBe(true)
    expect(game.tea.position).toBe('drop')
    expect(game.tea.waiting!.guests.map((guest) => guest.who)).toEqual(['mouse'])
    // The settled table stays: nothing more happens until the child touches the gate.
    expect(play(game, 10).filter((event) => event.type !== 'pour')).toEqual([])
  })

  it('gives no sign while the tea runs, and lifts only when the cup has been left alone', () => {
    const game = openGame(null, null)
    callPot(game, { id: 'cup-bear', guest: null, spot: thingById(game.world, 'cup-bear')! })
    play(game, 0.6)
    pressPot(game)
    expect(lifts(play(game, 3))).toEqual([])
    releasePot(game)
    expect(lifts(play(game, LIFT_AFTER - 0.3))).toEqual([])
    expect(lifts(play(game, 1))).toHaveLength(1)
  })

  it('never notes a pour made in several presses, and reacts once to each state of the cup', () => {
    const game = openGame(null, null)
    const first = lifts(pour(game, 'cup-bear', 1))
    expect(first).toHaveLength(1)
    expect(first[0].type === 'lift' && first[0].lift.taste).toBe('short')
    expect(thingById(game.world, 'cup-bear')!.tea).toBeGreaterThan(0.1)
    expect(lifts(play(game, 6))).toEqual([])
    expect(game.tea.guests[0].note).toBe(null)
    pour(game, 'cup-bear', 1)
    const last = pour(game, 'cup-bear', 2.4)
    expect(lifts(last).at(-1)).toMatchObject({ who: 'bear' })
    expect(game.tea.guests[0]).toMatchObject({ note: 'to-taste', content: true })
    expect(game.tea.position).toBe('drop')
  })

  it('brings out the bowl when the Mouse finds too much, keeps the tea, and stays where it is after one miss', () => {
    const game = at('drop')
    expect(game.tea.guests.map((guest) => guest.who)).toEqual(['mouse'])
    const events = pour(game, 'cup-mouse', 2.5)
    const lift = lifts(events)[0]
    expect(lift.type === 'lift' && lift.lift.taste).toBe('over')
    expect(events).toContainEqual({ type: 'tool', which: 'bowl' })
    expect(thingById(game.world, 'bowl')).toBeDefined()
    const tea = thingById(game.world, 'cup-mouse')!.tea
    expect(tea).toBeGreaterThan(0.3)
    expect(game.tea.guests[0].note).toBe('not-to-taste')
    // The child tips the cup into the bowl: it goes back on its saucer, empty.
    const saucer = thingById(game.world, 'cup-mouse')!.on
    pickUp(game, 'cup-mouse')
    carry(game, TRAY.bowl)
    const put = putDown(game, TRAY.bowl, null)
    expect(put[0]).toMatchObject({ type: 'put', result: 'tip-in', onto: 'bowl' })
    expect(thingById(game.world, 'cup-mouse')!).toMatchObject({ tea: 0, on: saucer })
    expect(thingById(game.world, 'bowl')!.tea).toBeCloseTo(tea, 9)
    const again = pour(game, 'cup-mouse', 0.8)
    expect(lifts(again).at(-1)).toMatchObject({ who: 'mouse' })
    expect(again).toContainEqual({ type: 'ended', outcome: 'mixed' })
    expect(game.tea.position).toBe('drop')
  })

  it('brings out the sponge with the first spill, and the Mouse will not lift until the puddle by her place is wiped', () => {
    const game = at('drop')
    spill(game.world, { x: placeOf(game, 'mouse').x, z: placeOf(game, 'mouse').z + 1.2 }, 0.3)
    expect(play(game, 0.1)).toContainEqual({ type: 'tool', which: 'sponge' })
    const events = pour(game, 'cup-mouse', 0.55)
    expect(lifts(events)).toEqual([])
    expect(events).toContainEqual({ type: 'waits', who: 'mouse', why: 'puddle-near' })
    pickUp(game, 'sponge')
    for (let i = 0; i <= 20; i++) carry(game, { x: placeOf(game, 'mouse').x - 1 + i * 0.1, z: placeOf(game, 'mouse').z + 1.2 })
    putDown(game, { x: 3, z: 2 }, null)
    expect(lifts(play(game, 2))).toHaveLength(1)
  })
})

describe('the next sitting', () => {
  it('starts only on the child\'s touch, keeps the puddles and the tools that are out, and seats the waiting party', () => {
    const game = openGame(null, null)
    expect(nextSitting(game)).toBe(false)
    const lift = lifts(pour(game, 'cup-bear', 7))[0]
    // The Bear licked his saucer dry after the cup.
    expect(lift.type === 'lift' && lift.licked).toBeGreaterThan(0.1)
    expect(game.world.things.filter((thing) => thing.kind === 'saucer').every((thing) => thing.tea === 0)).toBe(true)
    expect(game.tea.finished).toBe(true)
    const wet = game.world.puddles.reduce((sum, amount) => sum + amount, 0)
    expect(wet).toBeGreaterThan(0.2)
    expect(game.tea.tools.sponge).toBe(true)
    expect(nextSitting(game)).toBe(true)
    expect(game.tea.finished).toBe(false)
    expect(game.tea.waiting).toBe(null)
    expect(game.tea.guests).toEqual([{ who: 'mouse', seat: 0, note: null, content: false }])
    expect(game.world.puddles.reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(wet, 9)
    expect(thingById(game.world, 'sponge')).toBeDefined()
    // The pot waits beside the Mouse's cup, which stands at her laid place.
    expect(game.pot).toMatchObject({ held: false, hop: null, over: 'cup-mouse' })
    expect(dueShowing(game)).toBe(null)
  })

  it('shows each new idea at the first sitting of its position, and at no other', () => {
    // A first visit is shown the pour; a child who has been through a sitting is not shown it again.
    expect(dueShowing(openGame(null, null))).toBe('pour')
    const ideas = LADDER.map((position) => dueShowing(at(position)))
    expect(ideas).toEqual([null, null, 'lay', null, 'halfway', null, 'twins', 'sizes', null, null])
    // A child of six starts further on: the pour is still shown, first, and then the idea of that table.
    const older = openGame(null, 6)
    expect(older.tea.position).toBe('lay-a-place')
    expect(dueShowing(older)).toBe('pour')
    markShown(older, 'pour')
    expect(dueShowing(older)).toBe('lay')
    const seen = at('twins', { shown: ['twins'] })
    expect(dueShowing(seen)).toBe(null)
  })

  it('has a guest with no saucer wait with its cup in its paw, and say so once', () => {
    const game = at('lay-a-place')
    const who = game.tea.guests[0].who
    expect(thingById(game.world, `cup-${who}`)).toMatchObject({ heldBy: who, on: null, worn: false })
    // An empty cup is the ordinary want, not an event.
    expect(play(game, 3)).toEqual([])
    // With tea in the held cup it has nowhere to set it down: it waits, and says so once.
    const events = [...pour(game, `cup-${who}`, who === 'bear' ? 4.4 : 0.55), ...play(game, 5)]
    expect(events.filter((event) => event.type === 'waits')).toEqual([{ type: 'waits', who, why: 'no-saucer' }])
    expect(game.tea.guests[0].content).toBe(false)
  })
})

describe('what is saved', () => {
  it('puts the thing in the hand back where it was picked up, and the pot where its hop ends', () => {
    const game = openGame(null, null)
    const saucer = thingById(game.world, 'cup-bear')!.on
    pickUp(game, 'cup-bear')
    carry(game, { x: -3, z: 2 })
    const saved = stored(game)
    expect(saved.things.find((thing) => thing.id === 'cup-bear')).toMatchObject({ on: saucer })
    putDown(game, { x: -3, z: 2 }, null)
    callPot(game, { id: 'cup-bear', guest: null, spot: thingById(game.world, 'cup-bear')! })
    play(game, 0.1)
    const mid = stored(game)
    expect(mid.things.find((thing) => thing.kind === 'pot')).toMatchObject({ x: Math.round(game.pot.hop!.toX * 100) / 100, z: Math.round(game.pot.hop!.toZ * 100) / 100 })
  })

  it('keeps the tools in the tray in the list, and reads back to the same table', () => {
    const game = openGame(null, null)
    pour(game, 'cup-bear', 1.5)
    const saved = JSON.parse(JSON.stringify(stored(game)))
    expect(saved.things.map((thing: { kind: string }) => thing.kind)).toContain('sponge')
    const back = openGame(saved, null)
    expect(stored(back)).toEqual(stored(game))
    expect(thingById(back.world, 'cup-bear')!.tea).toBeCloseTo(thingById(game.world, 'cup-bear')!.tea, 3)
    // On load no scene replays: the guest has already taken in the cup as it stands.
    expect(play(back, 5)).toEqual([])
    expect(back.pot.over).toBe('cup-bear')
  })

  it('still lifts a cup that was poured to taste and put away before the sip, and plays nothing twice for one that was not', () => {
    // Put away with the finger just lifted: the cup is to the Bear's taste and he has not drunk.
    const game = openGame(null, null)
    callPot(game, { id: 'cup-bear', guest: null, spot: thingById(game.world, 'cup-bear')! })
    play(game, 0.6)
    pressPot(game)
    play(game, 4.4)
    releasePot(game)
    const back = openGame(JSON.parse(JSON.stringify(stored(game))), null)
    expect(thingById(back.world, 'cup-bear')!.tea).toBeGreaterThan(0.85)
    const events = play(back, LIFT_AFTER + 0.8)
    expect(lifts(events)).toHaveLength(1)
    expect(back.tea).toMatchObject({ finished: true, position: 'drop' })
    // Put away after he found too little: he has shown that already, and shows it no second time.
    const short = openGame(null, null)
    expect(lifts(pour(short, 'cup-bear', 1))).toHaveLength(1)
    const again = openGame(JSON.parse(JSON.stringify(stored(short))), null)
    expect(lifts(play(again, 6))).toEqual([])
  })

  it('never makes a miss of a second cup filled in several presses: the Duckling whose cup was filled first is not noted, and no bowl comes', () => {
    const game = at('twins', { shown: ['pour', 'lay', 'twins'] })
    for (const who of ['duckling-a', 'duckling-b'] as const) {
      pickUp(game, 'saucer-0')
      carry(game, placeOf(game, who))
      putDown(game, placeOf(game, who), null)
      const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)!
      const beside = { x: placeOf(game, who).x - 1.32, z: placeOf(game, who).z + 0.12 }
      pickUp(game, spoon.id)
      carry(game, beside)
      putDown(game, beside, null)
    }
    play(game, 2)
    pour(game, 'cup-duckling-a', 2)
    const first = thingById(game.world, 'cup-duckling-a')!.tea
    // A first press into the second cup: the two hold their cups rim to rim, and neither is a miss.
    const splash = pour(game, 'cup-duckling-b', 0.9)
    expect(thingById(game.world, 'cup-duckling-b')!.tea).toBeLessThan(first)
    expect(lifts(splash).map((event) => event.type === 'lift' && [event.who, event.lift.taste, event.lift.details.join()])).toEqual([['duckling-a', 'short', 'twin-has-less'], ['duckling-b', 'short', 'twin-has-more']])
    expect(game.tea.guests.map((guest) => guest.note)).toEqual([null, null])
    expect(splash.some((event) => event.type === 'tool')).toBe(false)
    // A second press brings it level: both drink, and both are noted as to taste.
    pressPot(game)
    const rest: GameEvent[] = []
    for (let i = 0; i < 400 && thingById(game.world, 'cup-duckling-b')!.tea < first - 0.004; i++) rest.push(...tick(game, 1 / 60))
    releasePot(game)
    rest.push(...play(game, LIFT_AFTER + 0.8))
    expect(lifts(rest).every((event) => event.type === 'lift' && event.lift.taste === 'right')).toBe(true)
    expect(game.tea.guests.map((guest) => guest.note)).toEqual(['to-taste', 'to-taste'])
    expect(game.tea.finished).toBe(true)
  })

  it('notes the Duckling whose cup is poured past its twin\'s, and brings the bowl', () => {
    const game = at('twins', { shown: ['pour', 'lay', 'twins'] })
    for (const who of ['duckling-a', 'duckling-b'] as const) {
      pickUp(game, 'saucer-0')
      carry(game, placeOf(game, who))
      putDown(game, placeOf(game, who), null)
      const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)!
      const beside = { x: placeOf(game, who).x - 1.32, z: placeOf(game, who).z + 0.12 }
      pickUp(game, spoon.id)
      carry(game, beside)
      putDown(game, beside, null)
    }
    play(game, 2)
    pour(game, 'cup-duckling-a', 1.2)
    const events = pour(game, 'cup-duckling-b', 2.6)
    expect(lifts(events).map((event) => event.type === 'lift' && [event.who, event.lift.taste])).toEqual([['duckling-a', 'short'], ['duckling-b', 'over']])
    expect(game.tea.guests.map((guest) => guest.note)).toEqual([null, 'not-to-taste'])
    expect(events.some((event) => event.type === 'tool' && event.which === 'bowl')).toBe(true)
  })

  it('finds too much only in the cup that was poured into last, whichever cup the child began with: first, second lower, then the first again past it', () => {
    const game = at('twins', { shown: ['pour', 'lay', 'twins'] })
    for (const who of ['duckling-a', 'duckling-b'] as const) {
      pickUp(game, 'saucer-0')
      carry(game, placeOf(game, who))
      putDown(game, placeOf(game, who), null)
      const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)!
      const beside = { x: placeOf(game, who).x - 1.32, z: placeOf(game, who).z + 0.12 }
      pickUp(game, spoon.id)
      carry(game, beside)
      putDown(game, beside, null)
    }
    play(game, 2)
    const teaOf = (id: string) => thingById(game.world, id)!.tea
    const notes = () => game.tea.guests.map((guest) => guest.note)
    // Step one: the first cup is poured. Its Duckling waits for its twin's, and nothing is noted.
    expect(lifts(pour(game, 'cup-duckling-a', 1.6))).toEqual([])
    expect(notes()).toEqual([null, null])
    // Step two: the second cup is poured and stops lower. Neither is a miss: the two have too little between them.
    const second = pour(game, 'cup-duckling-b', 0.9)
    expect(teaOf('cup-duckling-b')).toBeLessThan(teaOf('cup-duckling-a'))
    expect(lifts(second).map((event) => event.type === 'lift' && event.lift.taste)).toEqual(['short', 'short'])
    expect(notes()).toEqual([null, null])
    expect(second.some((event) => event.type === 'tool')).toBe(false)
    // Step three: the child adds to the first cup again. It was already the fuller and is now the cup that was
    // poured into last: that is too much, in the cup the child began with, and the other cup is not the miss.
    const before = teaOf('cup-duckling-a')
    const third = pour(game, 'cup-duckling-a', 0.8)
    expect(teaOf('cup-duckling-a')).toBeGreaterThan(before)
    expect(game.gained).toBe('cup-duckling-a')
    expect(lifts(third).map((event) => event.type === 'lift' && [event.who, event.lift.taste, event.lift.details.join()])).toEqual([['duckling-a', 'over', 'twin-has-less'], ['duckling-b', 'short', 'twin-has-more']])
    expect(notes()).toEqual(['not-to-taste', null])
    expect(third.some((event) => event.type === 'tool' && event.which === 'bowl')).toBe(true)
    // The second cup brought level ends the sitting, with the first Duckling noted as not to taste and the second as to taste.
    callPot(game, { id: 'cup-duckling-b', guest: null, spot: thingById(game.world, 'cup-duckling-b')! })
    play(game, 0.6)
    pressPot(game)
    for (let i = 0; i < 600 && teaOf('cup-duckling-b') < teaOf('cup-duckling-a') - 0.004; i++) tick(game, 1 / 60)
    releasePot(game)
    play(game, LIFT_AFTER + 0.8)
    expect(notes()).toEqual(['not-to-taste', 'to-taste'])
    expect(game.tea.finished).toBe(true)
  })

  it('has the Ducklings lift together when both cups are poured alike, and both drink', () => {
    const game = at('twins', { shown: ['pour', 'lay', 'twins'] })
    for (const who of ['duckling-a', 'duckling-b'] as const) {
      pickUp(game, 'saucer-0')
      carry(game, placeOf(game, who))
      putDown(game, placeOf(game, who), null)
      const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)!
      const beside = { x: placeOf(game, who).x - 1.32, z: placeOf(game, who).z + 0.12 }
      pickUp(game, spoon.id)
      carry(game, beside)
      putDown(game, beside, null)
    }
    play(game, 2)
    // The first cup alone: its Duckling waits for the twin's.
    expect(lifts(pour(game, 'cup-duckling-a', 2))).toEqual([])
    const events = pour(game, 'cup-duckling-b', 2)
    expect(lifts(events).map((event) => event.type === 'lift' && event.who).sort()).toEqual(['duckling-a', 'duckling-b'])
    expect(lifts(events).every((event) => event.type === 'lift' && event.lift.taste === 'right')).toBe(true)
    expect(thingById(game.world, 'cup-duckling-a')!.tea).toBe(0)
    expect(thingById(game.world, 'cup-duckling-b')!.tea).toBe(0)
    expect(game.tea.finished).toBe(true)
    // Nothing more comes of the two empty cups.
    expect(play(game, 6).filter((event) => event.type !== 'pour')).toEqual([])
  })

  it('loses nothing when it is put away in the middle of a sitting\'s end', () => {
    const game = openGame(null, null)
    pour(game, 'cup-bear', 4.4)
    const back = openGame(JSON.parse(JSON.stringify(stored(game))), null)
    expect(back.tea).toMatchObject({ finished: true, position: 'drop' })
    expect(back.tea.waiting!.guests.map((guest) => guest.who)).toEqual(['mouse'])
    expect(play(back, 5)).toEqual([])
    expect(CUP_HOLDS.house).toBe(1)
  })
})
