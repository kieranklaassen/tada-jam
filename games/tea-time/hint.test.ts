import { describe, expect, it } from 'vitest'
import { callPot, carry, pickUp, putDown } from './hands'
import { WAITING, hintFor } from './hint'
import { nextSitting, openGame, placeOf, tick, type Game } from './host'
import { TRAY } from './layout'
import { freshTeaState, serializeTea, type TeaState } from './save'
import { pourInto, spill, thingById } from './world'

const at = (position: string, over: Partial<TeaState> = {}): Game => {
  const game = openGame(JSON.parse(JSON.stringify(serializeTea({ ...freshTeaState(null), position, finished: true, ...over }))), null)
  nextSitting(game)
  // The pot hops to the first cup of the new table: it has landed before anything is tried.
  for (let i = 0; i < 30; i++) tick(game, 1 / 60)
  return game
}
const play = (game: Game, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) tick(game, 1 / 60) }
const move = (game: Game, id: string, to: { x: number; z: number }) => { pickUp(game, id); carry(game, to); putDown(game, to, null) }

describe('what an idle child is shown', () => {
  it('is one move at a time: hold the pot where it waits by a cup, and tap the cup to call a pot that is elsewhere', () => {
    const game = openGame(null, null)
    // At a first visit the pot waits beside the Bear's cup with its spout over it.
    expect(game.pot.over).toBe('cup-bear')
    expect(hintFor(game)).toMatchObject({ move: 'hold', on: 'pot' })
    callPot(game, { id: null, guest: null, spot: { x: -4, z: 2 } })
    play(game, 0.6)
    expect(hintFor(game)).toMatchObject({ move: 'tap', on: 'cup-bear' })
    callPot(game, { id: 'cup-bear', guest: null, spot: thingById(game.world, 'cup-bear')! })
    play(game, 0.6)
    expect(hintFor(game)).toMatchObject({ move: 'hold', on: 'pot' })
  })

  it('never shows an amount: the hint for a cup with too little is the same as for an empty one', () => {
    const game = openGame(null, null)
    callPot(game, { id: 'cup-bear', guest: null, spot: thingById(game.world, 'cup-bear')! })
    play(game, 0.6)
    const empty = hintFor(game)
    pourInto(game.world, 'cup-bear', 0.5)
    expect(hintFor(game)).toEqual(empty)
  })

  it('shows a saucer and then a spoon for each guest in turn, one of each from the tray, before any pour', () => {
    const game = at('halfway')
    const [first, second] = [...game.tea.guests].sort((a, b) => a.seat - b.seat).map((guest) => guest.who)
    expect(hintFor(game)).toMatchObject({ move: 'carry', on: 'saucer-3', at: TRAY.saucers, to: placeOf(game, first) })
    move(game, 'saucer-0', placeOf(game, first))
    // The first guest's spoon next, whoever it is: a spoon still in the row on the tray, to the left of its place.
    const spoon = hintFor(game)!
    expect(spoon).toMatchObject({ move: 'carry', to: { x: placeOf(game, first).x - 1.32 } })
    expect(spoon.on).toMatch(/^spoon-/)
    expect(thingById(game.world, spoon.on)!.z).toBeGreaterThan(2.5)
    move(game, spoon.on, { x: placeOf(game, first).x - 1.32, z: placeOf(game, first).z + 0.12 })
    // Its place is laid: now its cup wants tea. When it has drunk, the second guest's place is shown the same way.
    expect(hintFor(game)).toMatchObject({ move: 'tap', on: `cup-${first}` })
    game.tea.guests = game.tea.guests.map((guest) => (guest.who === first ? { ...guest, content: true } : guest))
    expect(hintFor(game)).toMatchObject({ move: 'carry', to: placeOf(game, second) })
    move(game, 'saucer-0', placeOf(game, second))
    const other = hintFor(game)!
    expect(other).toMatchObject({ move: 'carry', to: { x: placeOf(game, second).x - 1.32 } })
    // Never the spoon that already lies at the first place.
    expect(other.on).not.toBe(spoon.on)
  })

  it('shows a plain cup for a guest who came without one', () => {
    const game = at('whose-cup')
    const hint = hintFor(game)!
    expect(hint.move).toBe('carry')
    expect(hint.on).toMatch(/^cup-plain-/)
  })

  it('shows the bowl for a cup with too much, and the sponge for a puddle the Mouse minds', () => {
    const game = at('drop', { tools: { sponge: true, bowl: true } })
    pourInto(game.world, 'cup-mouse', 0.8)
    expect(hintFor(game)).toMatchObject({ move: 'carry', on: 'cup-mouse', to: { x: TRAY.bowl.x, z: TRAY.bowl.z } })
    thingById(game.world, 'cup-mouse')!.tea = 0.15
    spill(game.world, { x: placeOf(game, 'mouse').x, z: placeOf(game, 'mouse').z + 1.1 }, 0.3)
    expect(hintFor(game)).toMatchObject({ move: 'carry', on: 'sponge' })
  })

  it('shows the gate when the sitting has ended, and nothing while a thing is in the hand', () => {
    const game = at('brim')
    pickUp(game, 'cup-bear')
    expect(hintFor(game)).toBe(null)
    putDown(game, placeOf(game, 'bear'), null)
    game.tea.finished = true
    game.tea.waiting = { guests: [{ who: 'mouse', cup: 'own' }], trayCups: [], laysOwnPlace: true }
    expect(hintFor(game)).toEqual({ move: 'tap', on: 'gate', at: WAITING })
  })

  it('shows the twin\'s empty cup, not the pot over the cup that is already poured, when a Duckling waits for its twin', () => {
    const game = at('twins', { seed: 3, shown: ['pour', 'lay', 'halfway', 'twins', 'sizes'] })
    for (const guest of game.tea.guests) {
      const place = placeOf(game, guest.who)
      move(game, 'saucer-0', place)
      const spoon = game.world.things.find((thing) => thing.kind === 'spoon' && thing.z > 2.5)
      if (spoon) move(game, spoon.id, { x: place.x - 1.32, z: place.z + 0.12 })
    }
    play(game, 1)
    const first = hintFor(game)
    const poured = first!.on === 'pot' ? game.pot.over! : first!.on
    expect(poured.startsWith('cup-duckling')).toBe(true)
    pourInto(game.world, poured, 0.4)
    const other = poured === 'cup-duckling-a' ? 'cup-duckling-b' : 'cup-duckling-a'
    expect(hintFor(game)).toMatchObject({ move: 'tap', on: other })
    // A splash in the other cup, less than the first holds: the hand stays with the lower cup, and never shows the bowl for the fuller one.
    pourInto(game.world, other, 0.1)
    play(game, 0.1)
    expect(game.gained).toBe(other)
    expect(hintFor(game)).toMatchObject({ on: other })
  })

  it('shows nothing for a guest whose cup is already to its taste and waiting to be drunk', () => {
    const game = openGame(null, null)
    pourInto(game.world, 'cup-bear', 0.95)
    expect(hintFor(game)).toBe(null)
  })
})
