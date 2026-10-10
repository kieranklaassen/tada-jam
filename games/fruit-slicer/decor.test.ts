import { describe, expect, it } from 'vitest'
import { ANSWER_SECONDS, BAGS, BONE, CLOTH, LAMPS, STREET, decorAt, passerBox, type Decor } from './decor'
import { answer, answering, newFx, settled, step } from './fx'
import { GameRun } from './gameRun'
import { call, freshGame } from './cycle'
import { thingAt } from './moves'
import { serialize } from './save'
import { figureBox } from './seats'
import { COUNTER, WALL, inside } from './stage'
import { passersAt, type PasserKind } from './street'
import { notesOf } from './voices'

const BUSY = { glow: 0, demo: null, demoIndex: -1 }
/** A time at which a passer-by of this kind is well inside the street, and where it is then. */
function passing(kind: PasserKind): { time: number; x: number } {
  for (let time = 0; time < 400; time += 0.5) {
    const one = passersAt(time).find((other) => other.kind === kind)
    if (one && one.x > WALL.x + 420 && one.x < WALL.x + 600) return { time, x: one.x }
  }
  throw new Error(`no ${kind} in the street`)
}
/** A point on each of them: the passers-by at the time they are found passing, the rest where they always are. */
function pointOn(what: Decor): { time: number; at: { x: number; y: number } } {
  if (what === 'umbrella' || what === 'longDog' || what === 'barrow') {
    const found = passing(what)
    return { time: found.time, at: { x: found.x, y: STREET - 30 } }
  }
  const at = what === 'lamp' ? { x: LAMPS[1], y: WALL.y + 110 } : what === 'bone' ? BONE : what === 'cloth' ? { x: CLOTH.x + 20, y: CLOTH.y + 40 } : { x: BAGS.x + 30, y: BAGS.y - 20 }
  return { time: 1, at }
}
const ALL: readonly Decor[] = ['umbrella', 'longDog', 'barrow', 'lamp', 'bone', 'cloth', 'bags']

describe('the things about the stall that are no part of the task', () => {
  it('finds each where it is: a passer-by where it is walking now, a lamp on its post, the cloth, the bags and the bone on the counter', () => {
    for (const what of ALL) {
      const { time, at } = pointOn(what)
      expect(decorAt(at, time), what).toMatchObject({ what })
    }
    expect(decorAt({ x: LAMPS[0], y: WALL.y + 110 }, 1)).toMatchObject({ what: 'lamp', index: 0 })
    // A passer-by is found only while it is there, and bare wall and bare wood are none of them.
    const dog = passing('longDog')
    expect(decorAt({ x: dog.x, y: STREET - 30 }, dog.time)).not.toBeNull()
    for (const one of passersAt(dog.time)) expect(passerBox(one).y + passerBox(one).h).toBe(STREET)
    expect(decorAt({ x: WALL.x + 60, y: WALL.y + 20 }, 1)).toBeNull()
    expect(decorAt({ x: COUNTER.x + 40, y: COUNTER.y + 130 }, 1)).toBeNull()
    // The cloth, the bags and the bone lie on bare counter, clear of everything a finger works with.
    const game = call(freshGame(null), 0).game
    for (const what of ['bone', 'cloth', 'bags'] as const) {
      const { at } = pointOn(what)
      expect(inside(at, COUNTER), what).toBe(true)
      expect(thingAt(game, at).thing, what).toBe('counter')
    }
  })

  it('answers a tap with its own small thing, seen and heard, each unlike the others, and changes nothing in the game', () => {
    const heard = new Map<string, string>()
    for (const what of ALL) {
      const run = new GameRun(call(freshGame(null), 0).game, 11)
      const { time, at } = pointOn(what)
      // The child sees where things are in the frame, and taps there.
      run.frame(time, BUSY)
      const before = JSON.stringify(serialize(run.game))
      run.takeSounds()
      run.press(at, 0)
      run.tap(at)
      const sounds = run.takeSounds().map((sound) => sound.id)
      // The ring of the finger landing, and then the thing's own voice: not the tick of bare wood.
      expect(sounds, what).toHaveLength(2)
      expect(sounds[1], what).not.toBe('tickEnd')
      heard.set(what, sounds[1])
      expect(answering(run.fx, what, what === 'lamp' ? 1 : 0), what).toBe(0)
      expect(run.fx.fx.some((one) => one.kind === 'knock'), what).toBe(false)
      // It is in no state: nothing in the game changes, nothing is to be saved, and it is over in under a second.
      expect(JSON.stringify(serialize(run.game)), what).toBe(before)
      for (let i = 0; i < 60; i++) run.step(1 / 60)
      expect(answering(run.fx, what, what === 'lamp' ? 1 : 0), what).toBe(-1)
      expect(ANSWER_SECONDS[what]).toBeLessThan(1)
    }
    // Seven things, seven voices, and no two sound alike.
    expect(new Set(heard.values()).size).toBe(ALL.length)
    const notes = [...heard.values()].map((id) => JSON.stringify(notesOf(id as Parameters<typeof notesOf>[0])))
    expect(new Set(notes).size).toBe(ALL.length)
  })

  it('has the dog look down at its bone as it jumps', () => {
    const run = new GameRun(call(freshGame(null), 0).game, 11)
    run.frame(1, BUSY)
    run.press(BONE, 0)
    run.tap(BONE)
    run.step(0.1)
    expect(run.frame(1.1, BUSY).dog.eyeY).toBeGreaterThan(0.5)
  })

  it('answers afresh at a second tap, one answer at a time for each, and is settled when it is over', () => {
    let fx = answer(newFx(1), 'lamp', 0)
    fx = step(fx, 0.4)
    expect(answering(fx, 'lamp', 0)).toBeCloseTo(0.4 / ANSWER_SECONDS.lamp)
    fx = answer(fx, 'lamp', 0)
    expect(fx.fx.filter((one) => one.kind === 'decor')).toHaveLength(1)
    expect(answering(fx, 'lamp', 0)).toBe(0)
    expect(answering(fx, 'lamp', 1)).toBe(-1)
    for (let i = 0; i < 70; i++) fx = step(fx, 1 / 60)
    expect(settled(fx)).toBe(true)
  })

  it('never takes a tap that is on a customer: one who stands in front of a passer-by is the one that is touched', () => {
    const game = call(freshGame(null), 0).game
    const body = figureBox(game.window!, 'window')
    const at = { x: body.x + body.w / 2, y: STREET - 30 }
    expect(thingAt(game, at).thing).toBe('customer')
  })
})
