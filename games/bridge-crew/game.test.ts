import { describe, expect, it } from 'vitest'
import { CROSSINGS } from './bridges.fixture'
import { Game } from './game'
import { ROLL, parkAt, rackAt, waitAt } from './layout'
import { stream } from './look'
import { crossingTime } from './ride'
import { deserialize, edit, freshSave, serialize } from './save'
import { VEHICLES, trainOf } from './vehicles'

const fresh = () => new Game(freshSave(null), stream(5))
const drag = (game: Game, from: [number, number], to: [number, number]) => { game.press(...from); game.dragStart(); game.dragMove(...to); game.dragEnd() }
const tapAt = (game: Game, x: number, y: number) => { game.press(x, y); game.tap() }
const steps = (game: Game, seconds: number) => { for (let i = 0; i < seconds * 60; i++) game.step(1 / 60) }
/** Taps the vehicle at the front of the near bank and plays until its run has ended and its scene has begun. */
const send = (game: Game) => { tapAt(game, waitAt(game.at, 0) - 0.4, game.at.left[1] + 1); for (let i = 0; i < 60 * 20 && game.drive; i++) game.step(1 / 60) }
const stored = (game: Game) => JSON.parse(JSON.stringify(serialize(game.save)))

describe('the game on the toy', () => {
  it('opens on the first sheet with its job vehicle waiting at the near bank, and a first visit is set by the age hint', () => {
    const game = fresh()
    expect(game.at.id).toBe('plank-gap')
    expect(game.waiting).toEqual(['post-van'])
    expect(game.across).toEqual([])
    expect(new Game(freshSave(12), stream(1)).at.id).toBe('first-triangle')
    expect(new Game(freshSave(2), stream(1)).at.id).toBe('plank-gap')
  })

  it('a wrong bridge is run exactly as built: the plank cracks under the van, the run is saved at once, and the state stays', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    game.takeChange(); game.takeVoices()
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ vehicle: 'post-van', homeward: false })
    // The bridge is not changed under a vehicle: a touch is answered and nothing is laid.
    drag(game, [10, 8], [12, 8])
    expect(game.bridge).toHaveLength(1)
    let creaked = 0
    for (let i = 0; i < 60 * 20 && game.drive; i++) { game.step(1 / 60); creaked += game.takeVoices().length }
    // It was heard straining before it gave.
    expect(creaked).toBeGreaterThan(2)
    expect(game.show).toMatchObject({ kind: 'give', vehicle: 'post-van' })
    expect(game.gave).toMatchObject({ part: 0 })
    // The outcome is in the saved state the moment the scene starts, and is to be saved at once.
    expect(game.takeUrgent()).toBe(true)
    expect(game.save.tries).toBe(1)
    expect(game.save.sheets[0].ring).toMatchObject({ part: 0 })
    expect(game.save.waiting).toEqual(['post-van'])
    // The scene plays out by itself, and ends with the bridge back exactly as built and the van where it waits.
    steps(game, 6)
    expect(game.show.kind).toBeNull()
    expect(game.gave).toBeNull()
    expect(game.bridge).toHaveLength(1)
    expect(game.frame.firm).toEqual([true])
    expect(game.waiting).toEqual(['post-van'])
    expect(game.save.finished).toBe(false)
  })

  it('a touch ends a scene at once and is then an ordinary touch', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    send(game)
    steps(game, 0.5)
    expect(game.show.kind).toBe('give')
    game.takeVoices()
    // The touch that ends it lands on the pin half-way along the plank, which clicks and rattles the plank on it.
    tapAt(game, 12.1, 6.1)
    expect(game.show.kind).toBeNull()
    expect(game.gave).toBeNull()
    expect(game.rung[0]).toBeLessThan(1)
    // None of the scene's remaining sounds is played late: only the click and the rattle are heard.
    expect(game.takeVoices()).toHaveLength(2)
  })

  it('a bridge that holds is crossed: the cycle is judged at that moment, the next sheet is laid out and the other vehicle draws up', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    expect(game.bridge[0].turned).toBe(true)
    send(game)
    expect(game.show).toMatchObject({ kind: 'crossing', vehicle: 'post-van', reaction: { mood: 'like', act: 'parcels-stand' } })
    expect(game.takeUrgent()).toBe(true)
    expect(game.save).toMatchObject({ finished: true, position: 'rock-prop', next: { site: 'rock-prop', variant: 0 }, waiting: ['jelly-truck'], across: ['post-van'] })
    steps(game, 9)
    expect(game.show.kind).toBeNull()
    expect(game.waiting).toEqual(['jelly-truck'])
    expect(game.across).toEqual(['post-van'])
    // Nothing else starts by itself.
    steps(game, 20)
    expect(game.drive).toBeNull()
    expect(game.playing).toBe(false)
    expect(game.at.id).toBe('plank-gap')
  })

  it('put away in the middle of a scene and opened again, nothing is lost and no scene replays', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game)
    steps(game, 1)
    const again = new Game(deserialize(stored(game), null), stream(9))
    expect(again.show.kind).toBeNull()
    expect(again.playing).toBe(false)
    expect(again.takeVoices()).toEqual([])
    expect(again.waiting).toEqual(['jelly-truck'])
    expect(again.across).toEqual(['post-van'])
    expect(again.bridge).toEqual(game.bridge)
    // And in the middle of a run: the run is a view, so the van is back at the near bank and the bridge is as built.
    const other = fresh()
    drag(other, [10, 6], [14, 6])
    tapAt(other, waitAt(other.at, 0) - 0.4, 7)
    steps(other, 0.8)
    expect(other.drive).not.toBeNull()
    const reopened = new Game(deserialize(stored(other), null), stream(9))
    expect(reopened.drive).toBeNull()
    expect(reopened.waiting).toEqual(['post-van'])
    expect(reopened.save.tries).toBe(0)
  })

  it('the next sheet comes on the child\'s touch on the roll, and the sheets it has had hang on the rack', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game); steps(game, 9)
    game.takeUrgent()
    tapAt(game, ROLL.x - 0.3, game.at.right[1] + 1.5)
    expect(game.at.id).toBe('rock-prop')
    expect(game.bridge).toEqual([])
    expect(game.waiting).toEqual(['post-van'])
    expect(game.save).toMatchObject({ on: 1, finished: false, next: null })
    expect(game.takeUrgent()).toBe(true)
    // Back to the first sheet from the rack: its bridge stands and its van is parked on the far bank.
    tapAt(game, ...rackAt(0, 2))
    expect(game.at.id).toBe('plank-gap')
    expect(game.bridge).toHaveLength(1)
    expect(game.across).toEqual(['post-van'])
    expect(game.waiting).toEqual([])
    // Runs on a sheet from the rack are never judged.
    const position = game.save.position
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ homeward: true })
    steps(game, crossingTime(game.at, trainOf(VEHICLES['post-van'])) + 9)
    expect(game.waiting).toEqual(['post-van'])
    expect(game.save.position).toBe(position)
    expect(game.save.tries).toBe(0)
  })

  it('a parked vehicle touched drives home over the bridge, a real run, and one waiting behind comes to the front first', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game); steps(game, 9)
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ vehicle: 'post-van', homeward: true })
    steps(game, 12)
    expect(game.save).toMatchObject({ waiting: ['jelly-truck', 'post-van'], across: [] })
    // The van, second in line, comes to the front on a touch and sets off on the next.
    tapAt(game, waitAt(game.at, 1) - 0.4, 7)
    expect(game.drive).toBeNull()
    expect(game.save.waiting).toEqual(['post-van', 'jelly-truck'])
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ vehicle: 'post-van', homeward: false })
    // A vehicle whose way home has been taken away rolls off the far bank, paddles across and is home all the same.
    steps(game, 12)
    game.save = edit(game.save, [])
    const empty = new Game(game.save, stream(2))
    tapAt(empty, parkAt(empty.at, 1, 0) - 0.4, 7)
    steps(empty, 12)
    expect(empty.save.waiting).toContain('post-van')
    expect(empty.save.across).not.toContain('post-van')
    expect(empty.save.tries).toBe(0)
  })

  it('every sheet\'s own bridge carries its job vehicle through the whole game loop', () => {
    const game = new Game({ ...freshSave(null), position: 'rock-prop' }, stream(3))
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game); steps(game, 9)
    tapAt(game, ROLL.x - 0.3, 7.5)
    expect(game.at.id).toBe('first-triangle')
    game.save = edit(game.save, CROSSINGS['first-triangle'])
    const built = new Game(game.save, stream(4))
    send(built)
    expect(built.show.kind).toBe('crossing')
    expect(built.save.position).toBe('jelly-run')
  })
})
