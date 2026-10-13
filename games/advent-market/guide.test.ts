import { describe, expect, it } from 'vitest'
import type { Fair } from './fair'
import { glowsOf, showOf, type Show } from './guide'
import { REST } from './hall'
import { PLACES, STALLS, WALK, spotAt, type Place } from './places'
import { overSill } from './playing'
import { DT, fairAt, lift, made, run, seen } from './probe'
import type { Save } from './save'

// The ghost hand only ever shows a move that works: performed by a finger as
// the hand performs it, each one changes the fair. And it never shows the one
// move that empties anything.

/** The states the hand is asked about: a place as a first visit finds it, with a made piece, with something in the basket, and with the basket full. */
const STATES: { name: string; change: (save: Save, place: Place) => void }[] = [
  { name: 'fresh', change: () => {} },
  { name: 'a piece made', change: (save, place) => { if (place !== 'door') (save[place] as unknown) = made(place, 1) } },
  { name: 'a thing in the basket', change: (save) => { save.basket = [made('star', 2)] } },
  { name: 'a made piece and a full basket', change: (save, place) => { if (place !== 'door') (save[place] as unknown) = made(place, 1); save.basket = [0, 1, 2, 0, 1, 2].map((c) => made('wreath', c)) } },
]

/** A finger does what the hand shows: down at the start, across to the end if there is one, and up; twice where the hand presses twice. */
function perform(fair: Fair, show: Show): void {
  for (let n = 0; n < (show.to ? 1 : show.presses); n++) {
    fair.press(show.from.x, show.from.y)
    if (show.to) for (let i = 1; i <= 30; i++) { fair.move(show.from.x + ((show.to.x - show.from.x) * i) / 30, show.from.y + ((show.to.y - show.from.y) * i) / 30); fair.step(DT) }
    run(fair, 0.3)
    lift(fair)
    run(fair, 0.2)
  }
}

const at = (place: Place, state: (typeof STATES)[number]): Fair => fairAt(place, (save) => state.change(save, place), 4)

describe('the ghost hand', () => {
  it('shows only moves that work: done by a finger, every one of them changes the fair and is heard', () => {
    for (const place of PLACES) for (const state of STATES) for (const index of [0, 1, 2, 3]) {
      const fair = at(place, state), left = at(place, state)
      const before = JSON.stringify(fair.toSave()), show = showOf(fair, index), name = `${place}, ${state.name}, showing ${index}`
      if (!show) return expect.fail(`${name}: nothing to show`)
      perform(fair, show)
      const heard = fair.takeSounds().length
      run(fair, 3); run(left, 3)
      expect(heard, name).toBeGreaterThan(0)
      expect(JSON.stringify(fair.toSave()) !== before || JSON.stringify(seen(fair)) !== JSON.stringify(seen(left)), name).toBe(true)
    }
  })

  it('starts on something that answers a touch, and glows on something that does', () => {
    for (const place of PLACES) for (const state of STATES) for (const index of [0, 1]) {
      const fair = at(place, state)
      const standing = { place, covered: place !== 'door' && !fair.uncovered[place], things: fair.basket.length, finished: fair.finished }
      const show = showOf(fair, index)!
      // The stick hangs in the air, where no fixed thing is: the candle stall's own press finds it.
      if (show.from.x !== REST.x || show.from.y !== REST.y) expect(spotAt(show.from.x, show.from.y, standing).kind, `${place}, ${state.name}, ${index}`).not.toBe('wall')
      expect(glowsOf(fair).length).toBeGreaterThan(0)
    }
  })

  it('shows the work first and the way on after: the basket once a piece is made, the lantern once something lies in the basket', () => {
    for (const stall of STALLS) {
      const made1 = fairAt(stall, (save) => { (save[stall] as unknown) = made(stall, 1) })
      expect(showOf(made1, 0)).not.toEqual(showOf(made1, 1))
      const walking = fairAt(stall, (save) => { save.basket = [made('star', 0)] }), show = showOf(walking, 1)!
      expect(show.to).toBeNull()
      expect(spotAt(show.from.x, show.from.y, { place: stall, covered: false, things: 1, finished: false })).toEqual({ kind: 'lantern', dir: 1 })
      // A walk is one press: a second would walk on past the next stall.
      expect(show.presses).toBe(1)
    }
  })

  it('carries the basket out past the sill, onto the snow, once something lies in it', () => {
    const fair = fairAt('door', (save) => { save.basket = [0, 1, 2, 0, 1, 2].map((c) => made('wreath', c)) })
    for (const index of [0, 1, 2, 3]) {
      const show = showOf(fair, index)!
      expect(overSill(show.to!)).toBe(true)
      // It takes the basket by its wicker, where no thing in it answers instead.
      expect(spotAt(show.from.x, show.from.y, { place: 'door', covered: false, things: 6, finished: false })).toEqual({ kind: 'basket' })
    }
    perform(fair, showOf(fair, 0)!)
    expect(fair.finished).toBe(true)
  })

  it('never shows an empty basket carried out: at the door with nothing made it shows the lantern that walks back to the stalls', () => {
    const fair = fairAt('door')
    for (const index of [0, 1, 2, 3]) {
      const show = showOf(fair, index)!
      expect(show.to).toBeNull()
      expect(spotAt(show.from.x, show.from.y, { place: 'door', covered: false, things: 0, finished: false })).toEqual({ kind: 'lantern', dir: 1 })
    }
    expect(glowsOf(fair)).toEqual([{ x: WALK.right.x, y: WALK.right.y }])
    perform(fair, showOf(fair, 0)!)
    run(fair, 2)
    expect([fair.at, fair.finished]).toEqual(['candle', false])
  })

  it('shows nothing and lights nothing at the finished door: the one touch left there empties the basket and every hand', () => {
    const fair = fairAt('door', (save) => { save.finished = true; save.basket = [made('star')] })
    for (const index of [0, 1, 2, 3]) expect(showOf(fair, index)).toBeNull()
    expect(glowsOf(fair)).toEqual([])
    // And at a stall of a finished fair it shows the work or the walk, never a way to empty anything.
    for (const stall of STALLS) for (const index of [0, 1]) {
      const there = fairAt(stall, (save) => { save.finished = true; save.basket = [made('star')]; save.held.goat = made('wreath') })
      perform(there, showOf(there, index)!)
      run(there, 3)
      expect(there.basket).toHaveLength(1)
      expect(there.held.goat).not.toBeNull()
      expect(there.finished).toBe(true)
    }
  })
})
