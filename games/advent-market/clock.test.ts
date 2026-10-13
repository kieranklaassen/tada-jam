import { describe, expect, it } from 'vitest'
import { Fair } from './fair'
import { FOLK, REST, STICK } from './hall'
import { slotAt } from './places'
import { drag, fairAt, made } from './probe'
import { MARK } from './things'
import { freshSave } from './save'
import type { Sound } from './voices'

// One clock for sight and sound. The fair moves and sounds only by the
// seconds it is stepped with, which the Mount takes from the attended clock.
// Nothing in the game waits on a timer of the browser, reads the wall clock
// or schedules a sound ahead on the audio clock.

const sources = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Every way a browser tells the time or makes something happen later. */
const CLOCKS = ['setTimeout', 'setInterval', 'Date.now', 'new Date', 'performance.now', 'requestAnimationFrame', 'requestIdleCallback', 'currentTime', 'timeStamp', 'Math.random', 'queueMicrotask'] as const

/**
 * The only places in the whole folder that read a clock that is not the game's, the Mount and the audio that
 * came with the template included. Each is named with how many times it stands there and why. A new use
 * anywhere, in any file, fails.
 */
const ALLOWED: Record<string, Partial<Record<(typeof CLOCKS)[number], { times: number; why: string }>>> = {
  './advent-market.tsx': {
    requestAnimationFrame: { times: 2, why: 'the frame loop itself: it asks for the next frame, and for the first one when the game wakes' },
    'performance.now': { times: 7, why: 'the frame\'s own cost for the governor (twice), and the save throttle (three times, and twice in the comment that explains it), which is wall time by its contract' },
    timeStamp: { times: 6, why: 'the touch\'s own time, handed to the gesture reader (which tells a contact at rest by it, at a landing and at a move) and the grown-up overlay' },
    'Math.random': { times: 1, why: 'the seed of a first visit; from then on the save carries the stream' },
  },
  './audio.ts': {
    currentTime: { times: 3, why: 'a voice starts now, and a cut is made now: the audio clock is read and never scheduled ahead of' },
  },
  './rng.ts': {
    'Math.random': { times: 2, why: 'the default source of a new seed, once in a comment and once as that default' },
  },
}

const count = (code: string, word: string): number => code.split(word).length - 1

describe('one clock', () => {
  it('reads no clock but its own anywhere in the folder, but for the places named here', () => {
    const files = Object.keys(sources).filter((file) => !file.includes('.test.'))
    expect(files).toEqual(expect.arrayContaining(['./advent-market.tsx', './audio.ts', './fair.ts', './playing.ts', './view.ts', './sprites.ts', './visit.ts', './attention.ts', './quality.ts', './perf.ts', './saveCadence.ts', './overlay.ts', './input.ts']))
    for (const file of files) {
      for (const clock of CLOCKS) expect(count(sources[file], clock), `${file}: ${clock}`).toBe(ALLOWED[file]?.[clock]?.times ?? 0)
    }
    for (const [file, clocks] of Object.entries(ALLOWED)) for (const use of Object.values(clocks)) expect(use.why.length, file).toBeGreaterThan(20)
  })

  it('steps the fair from one place, by the attended clock, and makes no note wait', () => {
    const mount = sources['./advent-market.tsx']
    expect(mount).toContain('fair.step(playing.step)')
    expect(count(mount, 'fair.step(')).toBe(1)
    // A second part of a sound is laid on the game's clock (fair.after), never as a delay inside a voice.
    for (const file of ['./voices.ts', './folkVoices.ts', './notes.ts']) expect(count(sources[file], 'delay'), file).toBe(0)
  })

  it('shows and sounds each beat of a scene in the same step', () => {
    const fair = fairAt('candle', (save) => { save.basket = [made('candle', 1)] })
    drag(fair, slotAt(0), { x: FOLK.baker.touch.x, y: 300 })
    let breath = -1, mark = -1
    for (let i = 0; i < 300; i++) {
      fair.step(1 / 60)
      if (breath < 0 && fair.takeSounds().some((sound) => sound.name === 'whoosh')) breath = i
      if (mark < 0 && fair.shown.baker?.mark === MARK.blown) mark = i
    }
    expect(breath).toBeGreaterThan(0)
    expect(mark).toBe(breath)
  })

  it('makes every sound in the step or the touch that shows its cause', () => {
    const fair = new Fair(freshSave(null, 4))
    fair.press(REST.x, REST.y)
    fair.takeSounds()
    fair.move(REST.x, STICK.maxY)
    let drops = 0, rings = 0
    for (let i = 0; i < 400; i++) {
      if (i === 60) fair.move(REST.x, REST.y)
      const before = { drops: fair.dipping.drops.length, rings: fair.dipping.rings.length }
      fair.step(1 / 60)
      const heard: Sound[] = fair.takeSounds()
      const landed = heard.filter((s) => s.name === 'plip').length
      // A plip is heard in the very step in which its drop left the air and its ring appeared.
      if (landed > 0) {
        expect(fair.dipping.drops.length).toBeLessThan(before.drops + 1)
        expect(fair.dipping.rings.length).toBeGreaterThanOrEqual(Math.min(4, before.rings))
        drops += landed
        rings += 1
      }
    }
    expect(drops).toBeGreaterThanOrEqual(2)
    expect(rings).toBeGreaterThanOrEqual(2)
  })

  it('is silent and still while no time passes, however long the wall clock runs', () => {
    const fair = new Fair(freshSave(null, 4))
    fair.press(REST.x, REST.y)
    fair.move(REST.x, STICK.maxY)
    for (let i = 0; i < 30; i++) fair.step(1 / 60)
    fair.takeSounds()
    const before = JSON.stringify([fair.dipping.stick, fair.dipping.drops, fair.dipping.rings, fair.time])
    for (let i = 0; i < 1000; i++) fair.step(0)
    expect(fair.takeSounds()).toEqual([])
    expect(JSON.stringify([fair.dipping.stick, fair.dipping.drops, fair.dipping.rings, fair.time])).toBe(before)
  })

  it('plays the same fair, sound for sound, however the same seconds are cut into frames', () => {
    const play = (dt: number): string[] => {
      const fair = new Fair(freshSave(null, 8), 8)
      const heard: string[] = []
      fair.press(REST.x, REST.y)
      fair.move(REST.x, STICK.maxY)
      for (let t = 0; t < 1; t += dt) { fair.step(dt); heard.push(...fair.takeSounds().map((s) => s.name)) }
      fair.move(REST.x, REST.y)
      for (let t = 0; t < 3; t += dt) { fair.step(dt); heard.push(...fair.takeSounds().map((s) => s.name)) }
      return heard.filter((n) => n !== 'lick')
    }
    const at60 = play(1 / 60), at30 = play(1 / 30)
    expect(at60.slice(0, 3)).toEqual(['knock', 'gloop', 'lift'])
    expect(at30.slice(0, 3)).toEqual(at60.slice(0, 3))
    expect(at30.filter((n) => n === 'plip').length).toBe(at60.filter((n) => n === 'plip').length)
  })
})
