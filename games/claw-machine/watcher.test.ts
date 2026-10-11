import { describe, expect, it } from 'vitest'
import { STEP } from './claw'
import type { GameEvent } from './events'
import { newGame } from './gameScenes'
import { tap } from './play'
import { newWatcher, stepWatcher, watcherNotices, watcherPose, watcherSees, type WatcherAct, type WatcherPose } from './watcher'
import { newWorld } from './world'

const pose = (): WatcherPose => ({ dy: 0, squash: 1, turn: 0, gazeX: 0, gazeY: 0, blink: 0 })

describe('the watcher', () => {
  it('takes notice of a bang, of a toy that comes back and of a gulp, each in its own way', () => {
    const acts = (['bonk', 'wrong', 'gulp', 'pour'] as const).map((type) => watcherNotices({ type, column: 0, way: 'cannon', heavy: 1, who: 'red' } as GameEvent))
    expect(acts).toEqual(['start', 'laugh', 'nod', 'stare'])
    // The claw going about its work is nothing to it.
    expect(watcherNotices({ type: 'tick' })).toBeNull()
  })

  it('does each thing differently, never goes down into the floor, and is back as it was when it is over', () => {
    const peaks = new Set<string>()
    for (const act of ['start', 'laugh', 'nod', 'peep', 'stare'] as WatcherAct[]) {
      const watcher = newWatcher(), out = pose()
      watcherSees(watcher, act)
      let highest = 0, flattest = 1, tallest = 1
      for (let t = 0; t < 3 && watcher.act; t += STEP) {
        stepWatcher(watcher, STEP)
        watcherPose(watcher, 0, 0, 0, out)
        expect(out.dy).toBeGreaterThanOrEqual(0)
        highest = Math.max(highest, out.dy); flattest = Math.min(flattest, out.squash); tallest = Math.max(tallest, out.squash)
      }
      expect(watcher.act).toBeNull()
      peaks.add(`${highest.toFixed(1)} ${flattest.toFixed(2)} ${tallest.toFixed(2)}`)
    }
    expect(peaks.size).toBe(5)
  })

  it('finishes a laugh before it nods', () => {
    const watcher = newWatcher()
    watcherSees(watcher, 'laugh')
    stepWatcher(watcher, 0.2)
    watcherSees(watcher, 'nod')
    expect(watcher.act).toBe('laugh')
    watcherSees(watcher, 'peep')
    expect(watcher.act).toBe('peep')
  })

  it('hops and peeps under a finger, changes nothing in the game, and lets a scene end as any touch does', () => {
    const game = newGame(newWorld(null, 5))
    const before = JSON.stringify(game.world)
    game.poke()
    expect(game.takeEvents().map((event) => event.type)).toEqual(['peep'])
    expect(game.watcher.act).toBe('peep')
    game.advance(2)
    expect(game.watcher.act).toBeNull()
    expect(JSON.stringify(game.world)).toBe(before)
    // In the middle of a delivery a finger on it ends the scene, with everything where it was going.
    tap(game, { on: 'ledge', which: 0 }, 1.5)
    expect(game.scene).not.toBeNull()
    game.poke()
    expect(game.scene).toBeNull()
    for (const body of game.bodies) expect(body.mode).toBe('resting')
  })
})
