import { describe, expect, it } from 'vitest'
import { ACTS, AT_REST, FULLEST, GAIT, STRETCH, sleeping, type Direction } from './acts'
import { CELLS } from './cells'
import { FOLK } from './folk'
import { LIMITS, seconds } from './voices'

// The second grid of ART.md as numbers: what each of the three does with its
// thing on each of the five supports. Every cell has a motion and a sound of
// its own.

const OWN: Record<string, 'leaf' | 'cap' | 'feather'> = { fat: 'leaf', tiny: 'cap', tidy: 'feather' }
const CELL_ACTS = FOLK.flatMap((who) => Object.values(CELLS[OWN[who]]).map((cell) => ({ who, name: cell.is as keyof typeof ACTS })))
const NONE = ['noLeaf', 'noCap', 'noFeather'] as const

/** How an act moves, sampled along its length: every channel of the direction at moments that fall on no beat of a stroke. */
const motion = (name: keyof typeof ACTS): string => {
  const out: string[] = []
  for (let i = 0; i <= 37; i++) {
    const d = ACTS[name].pose(i / 37)
    out.push([d.dx, d.dy, d.fall, d.turn, d.lean, d.bob, d.part, d.prop, d.lid, d.open, d.brow, d.wide].map((value) => value.toFixed(2)).join(' ') + d.mouth)
  }
  return out.join('|')
}
const sound = (name: keyof typeof ACTS): string => JSON.stringify(ACTS[name].cues.map((cue) => [cue.voice, cue.does]))

describe('what the three do at evening', () => {
  it('has an act for every cell of the second grid, done by the one whose thing it is', () => {
    expect(CELL_ACTS).toHaveLength(15)
    for (const { who, name } of CELL_ACTS) expect(ACTS[name], name).toMatchObject({ who })
    expect(NONE.map((name) => ACTS[name].who)).toEqual(['fat', 'tiny', 'tidy'])
    expect(Object.keys(ACTS)).toHaveLength(18)
  })

  it('moves differently in every cell, and sounds different in every cell', () => {
    const names = [...CELL_ACTS.map((entry) => entry.name), ...NONE]
    expect(new Set(names.map(motion)).size).toBe(18)
    expect(new Set(names.map(sound)).size).toBe(18)
    // Every act is seen to do something: its body moves, turns or its parts do.
    for (const name of names) expect(new Set(motion(name).split('|')).size, name).toBeGreaterThan(6)
  })

  it('makes a sound in every cell, by its own voice or through the thing that rocks under it', () => {
    for (const { name } of CELL_ACTS) {
      const act = ACTS[name]
      const voiced = act.cues.some((cue) => cue.voice !== null)
      const rocks = act.cues.some((cue) => cue.does.includes('rock'))
      expect(voiced || rocks, name).toBe(true)
      // A cell that is heard through its thing has a thing that knocks when it rocks.
      if (!voiced) expect(CELLS[OWN[act.who]], name).toSatisfy((row: typeof CELLS.cap) => Object.values(row).some((cell) => cell.is === name && cell.rock !== null && cell.rock.heard))
    }
    // The cradle creaks and the bell dings through their own knocks.
    expect(CELLS.cap.moss.rock!.turns).toBeGreaterThanOrEqual(3)
    expect(CELLS.cap.twig.rock!.turns).toBeGreaterThanOrEqual(3)
    expect(CELLS.cap.bark.rock!.turns).toBeGreaterThanOrEqual(3)
  })

  it('times every moment inside its act, in order, with a voice inside the limits and no delay', () => {
    for (const [name, act] of Object.entries(ACTS)) {
      expect(act.lasts, name).toBeGreaterThanOrEqual(1.5)
      expect(act.lasts, name).toBeLessThanOrEqual(3)
      let last = 0
      for (const cue of act.cues) {
        expect(cue.at, name).toBeGreaterThanOrEqual(last)
        expect(cue.at, name).toBeLessThan(1)
        last = cue.at
        if (!cue.voice) continue
        expect(seconds(cue.voice), name).toBeLessThanOrEqual(LIMITS.maxSeconds)
        for (const note of cue.voice) expect(note.delay ?? 0, name).toBe(0)
      }
    }
  })

  it('starts every act standing as it stood, so nothing jumps as an act begins', () => {
    // How an act ends is taken up by the body's own springs (folk.test.ts): the fat one ends sitting where the roof was.
    for (const [name, act] of Object.entries(ACTS)) {
      const first: Direction = act.pose(0)
      expect([first.dx, first.dy, first.fall, first.turn, first.lean, first.bob].every((value) => Math.abs(value) < 0.01), name).toBe(true)
    }
    // The acts that stay are the two it sleeps in.
    expect(Object.entries(ACTS).filter(([, act]) => act.stays).map(([name]) => name)).toEqual(['bed', 'cradle'])
  })

  it('keeps the tiny one awake in a cradle it does not sleep in: no shut eyes at any moment, and the sigh only where it sleeps', () => {
    const cradle = ACTS.cradle
    for (let i = 0; i <= 100; i++) {
      const awake = cradle.pose(i / 100, { ...FULLEST, sleeps: false })
      expect(awake.lid).toBe(0)
    }
    expect(cradle.pose(0.9, { ...FULLEST, sleeps: true }).lid).toBe(1)
    // It hops out at the end, where the one that sleeps lies still.
    expect(cradle.pose(0.95, { ...FULLEST, sleeps: false }).dy).toBeLessThan(cradle.pose(0.95, { ...FULLEST, sleeps: true }).dy - 10)
    const sigh = cradle.cues.find((cue) => cue.voice !== null)!
    expect(sigh.when!({ sleeps: false } as never)).toBe(false)
    expect(sigh.when!({ sleeps: true } as never)).toBe(true)
  })

  it('gives each of the three its own walk, its own sleep and its own way of waking', () => {
    expect(new Set(FOLK.map((who) => `${GAIT[who].lasts} ${GAIT[who].steps} ${GAIT[who].lift}`)).size).toBe(3)
    const sleeps = FOLK.map((who) => JSON.stringify(sleeping(who, false, 0.3)))
    expect(new Set(sleeps).size).toBe(3)
    for (const who of FOLK) {
      expect(sleeping(who, true, 0).lid).toBe(1)
      // A sleeper breathes.
      expect(JSON.stringify(sleeping(who, false, 0))).not.toBe(JSON.stringify(sleeping(who, false, 1)))
    }
    const wakes = FOLK.map((who) => [0.2, 0.5, 0.8].map((p) => JSON.stringify({ ...AT_REST, ...STRETCH[who].pose(p) })).join('|'))
    expect(new Set(wakes).size).toBe(3)
    expect(new Set(FOLK.map((who) => JSON.stringify(STRETCH[who].voice))).size).toBe(3)
  })
})
