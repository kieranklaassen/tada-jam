import { describe, expect, it } from 'vitest'
import { CASES, perform } from './cases'
import type { Play } from './play'
import { FRAME, heard, picture, reopened, run, stored } from './testing'

// Found as left, at any instant. A put-away may come in the middle of a cut, with a box in the hand, half-way
// through a scene: what is then on the screen is what a load of the save shows, nothing of it is heard again,
// and no scene plays on the next visit. Each act of the grid is stopped at many instants to hold that.

/** Instants of an act: the first steps one by one (the touch itself), then a spread over the rest. */
function instants(steps: number): number[] {
  const all = new Set<number>([1, 2, 3, 5, 8, 12, 17, 18, 19, 20, 24])
  for (let i = 1; i <= 14; i++) all.add(Math.round((steps * i) / 14))
  return [...all].filter((stop) => stop >= 1 && stop <= steps).sort((a, b) => a - b)
}

/** Nothing of a touch or a scene is left over: no flag, no timer, no thing held back from where the save has it. */
function clean(play: Play, when: string): void {
  const toy = play.toy
  expect(play.busy, when).toBe(false)
  expect([toy.pressed, toy.sceneRunning, toy.hand, toy.stroke, toy.strip, toy.carriedBy, toy.clothBy, toy.bulbsBy, toy.rollBy, toy.holds.size, toy.withBaby.size], when).toEqual([false, false, null, null, null, null, null, null, null, 0, 0])
}

describe('found as left', () => {
  it.each(CASES.map((entry) => [entry.name, entry] as const))('parked at any instant is the picture a load shows, and stays silent: %s', (_, entry) => {
    const whole = perform(entry).steps
    for (const stop of instants(whole)) {
      const { play } = perform(entry, stop), when = `${entry.name}, stopped at step ${stop} of ${whole}`
      play.park()
      clean(play, when)
      expect(play.toy.cues, when).toEqual([])
      expect(play.toy.hushed, when).toBe(true)
      const loaded = reopened(play)
      expect(picture(play.toy), when).toEqual(picture(loaded.toy))
      // A parked game stays mounted. Shown again, it goes on as a loaded one does: no scene, no sound, nothing moves.
      const saved = stored(play.toy.state)
      for (const game of [play, loaded]) {
        expect(run(game, 9, 1 / 20), when).toEqual([])
        expect(game.toy.sceneRunning, when).toBe(false)
        expect(stored(game.toy.state), when).toEqual(saved)
      }
      expect(picture(play.toy), when).toEqual(picture(loaded.toy))
    }
  })

  it.each(CASES.map((entry) => [entry.name, entry] as const))('loses nothing and replays nothing when the save of any instant is opened: %s', (_, entry) => {
    const whole = perform(entry).steps
    for (const stop of instants(whole)) {
      const { play } = perform(entry, stop), when = `${entry.name}, stopped at step ${stop} of ${whole}`
      // The save as it stands at that instant, with no put-away: a scene's outcome was in it from its first frame.
      const loaded = reopened(play), saved = stored(loaded.toy.state)
      // What the game holds is always a fort that could have been built: a load changes nothing in it.
      expect(saved, when).toEqual(stored(play.toy.state))
      clean(loaded, when)
      expect(loaded.toy.time, when).toBe(0)
      expect(loaded.toy.kicks.size, when).toBe(0)
      // No timer is full on load: the idle ladder starts from the bottom.
      const guidance = loaded.step(FRAME)
      expect([guidance.glow, guidance.demo], when).toEqual([0, null])
      expect(heard(loaded), when).toEqual([])
      expect(run(loaded, 6, 1 / 20), when).toEqual([])
      expect(stored(loaded.toy.state), when).toEqual(saved)
    }
  })

  it.each(CASES.map((entry) => [entry.name, entry] as const))('leaves no flag, no timer and no held thing behind when it is over: %s', (_, entry) => {
    const { play } = perform(entry)
    clean(play, entry.name)
    const saved = stored(play.toy.state)
    // And it is over for good: nothing more starts by itself.
    expect(run(play, 8, 1 / 20).map((cue) => cue.sound)).toEqual([])
    expect(stored(play.toy.state)).toEqual(saved)
    // What is not stored and is gone on a load: the piece on the rug, the scissors' last turn, and the hole the cat is wary of.
    const lasting = (game: Play): unknown => ({ ...(picture(game.toy) as object), piece: null, olds: [], scissors: null, wary: null, watching: 0 })
    expect(lasting(play)).toEqual(lasting(reopened(play)))
  })
})
