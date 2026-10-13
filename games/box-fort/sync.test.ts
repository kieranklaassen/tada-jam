import { describe, expect, it } from 'vitest'
import { CASES, clock, perform } from './cases'
import { MOVERS, SOUND_MOVERS, goesWith } from './movers'
import { FRAME, first, heard, run } from './testing'
import { SOUNDS } from './voices'
import people from './people.ts?raw'
import diorama from './view/diorama.ts?raw'
import cast from './view/cast.ts?raw'
import targets from './targets.ts?raw'
import acts from './acts.ts?raw'
import toy from './toy.ts?raw'

// One clock for what is seen and what is heard. Every sound is a cue stamped with the game's clock at the very
// call that starts the motion it names, and the Mount plays a frame's cues in that frame. `heard` in testing.ts
// throws on a cue that breaks this, and every act of the grid is played through it.

/** What lands with one sound: the sound is heard in the frame the thing arrives, not when it sets off. */
const LANDINGS = ['thump', 'boom', 'fold', 'whumpf', 'tumble'] as const

describe('sight and sound on one clock', () => {
  it('names a motion for every sound, and draws every motion a sound can start', () => {
    for (const sound of SOUNDS) expect(SOUND_MOVERS[sound].length, sound).toBeGreaterThan(0)
    // What is drawn: the poses, the view, where a thing is touched, and the shapes acts.ts and toy.ts hand the view (the cloth, the bulbs, the blades).
    const drawing = people + diorama + cast + targets + acts.replace(/mover: '[^']+'/g, '') + toy
    for (const mover of MOVERS) {
      // A star stands for a number: the drawing reads these by their stem.
      const stem = mover.endsWith('*') ? mover.slice(0, -1) : mover
      const read = new RegExp(`age\\((['\`])${stem}`).test(drawing)
      expect(read, `no drawing reads the motion ${mover}`).toBe(true)
    }
  })

  it('catches a sound with no motion, a motion of another kind, and a sound stamped at another time', () => {
    const play = first()
    play.toy.cues.push({ sound: 'thump', variant: 0, pitch: 1, gain: 1, mover: 'box:0', at: play.toy.time, scene: false })
    expect(() => heard(play)).toThrow(/without its motion/)
    play.toy.cue('thump', 'cat:tap')
    expect(() => heard(play)).toThrow(/does not go with/)
    play.toy.cue('thump', 'box:0')
    play.toy.step(FRAME)
    expect(() => heard(play)).toThrow(/was queued at/)
    expect(goesWith('thump', 'box:3')).toBe(true)
  })

  it.each(CASES.map((entry) => [entry.name, entry] as const))('starts every sound with its motion, and hears a landing when it lands: %s', (_, entry) => {
    let landed = 0
    const { cues } = perform(entry, Infinity, (play, now) => {
      for (const cue of now) {
        // A cue is taken in the frame it was queued in: there is no wait hidden between the motion and the sound.
        expect(cue.at).toBe(play.toy.time)
        expect(play.toy.age(cue.mover)).toBe(0)
        if ((LANDINGS as readonly string[]).includes(cue.sound) && /^(box|cushion|toy):/.test(cue.mover)) { expect(play.toy.moving(cue.mover), `${cue.sound} of ${cue.mover}`).toBe(1); landed++ }
      }
    })
    expect(cues.length).toBeGreaterThan(0)
    if (entry.sounds.some((sound) => (LANDINGS as readonly string[]).includes(sound))) expect(landed).toBeGreaterThan(0)
  })

  it.each(CASES.map((entry) => [entry.name, entry] as const))('makes the same sounds at the same moments whatever the frame rate: %s', (_, entry) => {
    const times = (dt: number): Map<string, number[]> => {
      clock.dt = dt
      try {
        const { cues } = perform(entry), by = new Map<string, number[]>()
        for (const cue of cues) by.set(cue.sound, [...(by.get(cue.sound) ?? []), cue.at])
        return by
      } finally { clock.dt = FRAME }
    }
    const smooth = times(1 / 60), slow = times(1 / 24), fast = times(1 / 120)
    for (const other of [slow, fast]) {
      expect([...other.keys()].sort()).toEqual([...smooth.keys()].sort())
      for (const [sound, at] of smooth) {
        expect(other.get(sound)!.length, sound).toBe(at.length)
        // Waits are seconds on the clock, not frames: a sound moves by less than two of the longest frames.
        at.forEach((time, i) => expect(Math.abs(other.get(sound)![i] - time), sound).toBeLessThan(0.1))
      }
    }
  })

  it('keeps time by seconds, not frames: one long frame plays what many short ones play', () => {
    const a = first(), b = first()
    a.down(1, 400, 400); b.down(1, 400, 400)
    heard(a); heard(b)
    a.up(1, 400, 400); b.up(1, 400, 400)
    const short = run(a, 3, 1 / 120).map((cue) => cue.sound), long = run(b, 3, 1 / 10).map((cue) => cue.sound)
    expect(long).toEqual(short)
  })
})
