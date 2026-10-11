import { describe, expect, it } from 'vitest'
import { LEAVE_AT_MOST, REACTIONS, SHEETS, newActor, poseOf, reactAfter, reactTo, stepActor, type Actor, type CastPose } from './cast'
import type { Who } from './orders'

const WHOS: Who[] = ['pelican', 'twins', 'ants', 'cat', 'boa']
function play(actor: Actor, seconds: number, each?: (actor: Actor) => void): Actor {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    actor = stepActor(actor, 1 / 60)
    each?.(actor)
  }
  return actor
}
const numbers = (pose: CastPose): number[] => [pose.bob / 10, pose.lean, pose.flat, pose.stretch, pose.head, pose.mouth, pose.lids, pose.eyeX, pose.eyeY, Math.sin(pose.part), pose.bit, pose.tuft, pose.hop / 10, pose.away, pose.turn, pose.brow, pose.pop]
/** What one action looks like: the pose sampled through it, with the breathing taken out by starting every one at the same moment. */
function print(who: Who, set: Partial<Actor>, seconds: number): number[] {
  const out: number[] = []
  for (let k = 0; k < 20; k++) {
    const age = (k / 20) * seconds
    out.push(...numbers(poseOf({ ...newActor(who, 1), t: 2, ...set, idleAge: set.idle ? age : 0, reactAge: set.react ? age : 0 })))
  }
  return out
}
const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, k) => sum + (value - b[k]) ** 2, 0))

describe('every customer', () => {
  it('has its own tempo: no two breathe at the same rate', () => {
    expect(new Set(WHOS.map((who) => SHEETS[who].tempo)).size).toBe(WHOS.length)
  })

  it('is alive at idle: its pose never stands still, and it does small things after a rest, never the same twice running', () => {
    for (const who of WHOS) {
      const seen = new Set<string>(), done: string[] = []
      let before: string | null = null
      play(newActor(who, 7), 120, (actor) => {
        seen.add(numbers(poseOf(actor)).map((n) => n.toFixed(2)).join())
        if (actor.idle && actor.idle !== before) done.push(actor.idle)
        before = actor.idle
      })
      expect(seen.size, who).toBeGreaterThan(1000)
      expect(done.length, who).toBeGreaterThan(8)
      for (let k = 1; k < done.length; k++) expect(done[k], who).not.toBe(done[k - 1])
      expect(new Set(done), who).toEqual(new Set(Object.keys(SHEETS[who].idle)))
    }
  })

  it('rests between its small things: it never asks or beckons', () => {
    for (const who of WHOS) {
      let busy = 0, frames = 0
      play(newActor(who, 3), 120, (actor) => {
        frames++
        if (actor.idle) busy++
      })
      expect(busy / frames, who).toBeLessThan(0.6)
    }
  })

  it('keeps every number of its pose in range, at idle and through every reaction', () => {
    const check = (pose: CastPose, where: string) => {
      for (const [name, value, low, high] of [
        ['bob', pose.bob, -6, 6], ['lean', pose.lean, -0.7, 0.7], ['flat', pose.flat, 0, 1], ['stretch', pose.stretch, 0, 0.4], ['mouth', pose.mouth, 0, 1.01],
        ['lids', pose.lids, -1, 1.01], ['eyeX', pose.eyeX, -1, 1], ['eyeY', pose.eyeY, -1, 1], ['bit', pose.bit, -1.3, 1.3], ['tuft', pose.tuft, 0, 1.31], ['hop', pose.hop, 0, 16], ['away', pose.away, 0, 1], ['turn', pose.turn, 0, 1], ['brow', pose.brow, -1, 1], ['pop', pose.pop, 0, 1],
      ] as const) {
        expect(value, `${where} ${name}`).toBeGreaterThanOrEqual(low)
        expect(value, `${where} ${name}`).toBeLessThanOrEqual(high)
      }
    }
    for (const who of WHOS) {
      play(newActor(who, 5), 60, (actor) => check(poseOf(actor, 1), `${who} idle`))
      for (const reaction of REACTIONS) play(reactTo(newActor(who, 5), reaction), 2.2, (actor) => check(poseOf(actor, 2), `${who} ${reaction}`))
    }
  })

  it('reacts at once, drops what it was doing, and goes back to idling', () => {
    for (const who of WHOS) {
      const busy: Actor = { ...newActor(who, 2), idle: Object.keys(SHEETS[who].idle)[0], idleAge: 0.1 }
      const poked = reactTo(busy, 'flinch')
      expect(poked).toMatchObject({ react: 'flinch', reactAge: 0, idle: null })
      expect(play(poked, SHEETS[who].react.flinch + 0.1).react).toBeNull()
    }
  })

  it('plays its own flinch or snip to the end before a step or a stare that follows it in the same touch', () => {
    for (const who of WHOS) {
      for (const own of ['flinch', 'snip'] as const) {
        const called = reactAfter(reactTo(newActor(who, 2), own), 'step')
        expect(called).toMatchObject({ react: own, reactAge: 0, then: 'step' })
        expect(play(called, SHEETS[who].react[own] - 0.05).react).toBe(own)
        const stepping = play(called, SHEETS[who].react[own] + 0.05)
        expect(stepping).toMatchObject({ react: 'step', then: null })
        expect(stepping.reactAge).toBeLessThan(0.1)
        expect(play(called, SHEETS[who].react[own] + SHEETS[who].react.step + 0.1).react).toBeNull()
      }
      // Anything else gives way at once, and a fresh reaction forgets what was to follow the old one.
      expect(reactAfter(reactTo(newActor(who, 2), 'lick'), 'gawp')).toMatchObject({ react: 'gawp', then: null })
      expect(reactTo(reactAfter(reactTo(newActor(who, 2), 'flinch'), 'step'), 'flat')).toMatchObject({ react: 'flat', then: null })
    }
  })

  it('loses a tuft to the blade and has it back before the reaction is over', () => {
    for (const who of WHOS) {
      let least = 1
      const after = play(reactTo(newActor(who, 2), 'snip'), SHEETS[who].react.snip - 0.02, (actor) => (least = Math.min(least, poseOf(actor).tuft)))
      expect(least, who).toBe(0)
      expect(poseOf(after).tuft, who).toBeGreaterThanOrEqual(0.9)
    }
  })

  it('leaves like itself, in a second or less: it turns about, is out of sight when the leaving ends, and never goes back', () => {
    for (const who of WHOS) {
      expect(SHEETS[who].react.leave, who).toBeLessThanOrEqual(LEAVE_AT_MOST)
      expect(poseOf(newActor(who, 2)), who).toMatchObject({ away: 0, turn: 0 })
      let before = 0
      const members = who === 'twins' ? [0, 1] : [0]
      const last = play(reactTo(newActor(who, 2), 'leave'), SHEETS[who].react.leave - 0.02, (actor) => {
        const away = poseOf(actor).away
        expect(away, who).toBeGreaterThanOrEqual(before)
        before = away
      })
      for (const member of members) expect(poseOf(last, member), `${who} ${member}`).toMatchObject({ turn: 1 })
      for (const member of members) expect(poseOf(last, member).away, `${who} ${member}`).toBeGreaterThan(0.93)
    }
    // The twins bolt one after the other; the cat stretches first and only then turns its back.
    const twins = play(reactTo(newActor('twins', 2), 'leave'), 0.2)
    expect(poseOf(twins, 0).away).toBeGreaterThan(poseOf(twins, 1).away)
    const cat = play(reactTo(newActor('cat', 2), 'leave'), 0.2)
    expect(poseOf(cat)).toMatchObject({ away: 0, turn: 0 })
    expect(poseOf(cat).stretch).toBeGreaterThan(0.1)
  })

  it('stares in its own way when something absurd happens to somebody else: eyes out on stalks, and back in before it is over', () => {
    for (const who of WHOS) {
      expect(poseOf(newActor(who, 2)).pop, who).toBe(0)
      let most = 0
      const after = play(reactTo(newActor(who, 2), 'gawp'), SHEETS[who].react.gawp - 0.02, (actor) => (most = Math.max(most, poseOf(actor).pop)))
      expect(most, who).toBeGreaterThan(0.5)
      expect(poseOf(after).pop, who).toBeLessThan(0.2)
    }
    // The pelican is the last to notice, and the cat looks away first.
    expect(poseOf(play(reactTo(newActor('pelican', 2), 'gawp'), 0.3)).pop).toBe(0)
    expect(poseOf(play(reactTo(newActor('twins', 2), 'gawp'), 0.15)).pop).toBe(1)
    const cat = poseOf(play(reactTo(newActor('cat', 2), 'gawp'), 0.4))
    expect(cat.pop).toBe(0)
    expect(cat.lids).toBe(1)
  })

  it('is rolled flat as a page and springs back', () => {
    for (const who of WHOS) {
      let most = 0
      const after = play(reactTo(newActor(who, 2), 'flat'), SHEETS[who].react.flat + 0.1, (actor) => (most = Math.max(most, poseOf(actor).flat)))
      expect(most, who).toBe(1)
      expect(poseOf(after).flat, who).toBe(0)
    }
  })
})

describe('no shared animation', () => {
  it('no two customers take the same reaction the same way, or nearly', () => {
    for (const reaction of REACTIONS) {
      const prints = WHOS.map((who) => ({ who, numbers: print(who, { react: reaction }, SHEETS[who].react[reaction]) }))
      for (let a = 0; a < prints.length; a++) for (let b = a + 1; b < prints.length; b++) expect(distance(prints[a].numbers, prints[b].numbers), `${reaction}: ${prints[a].who} against ${prints[b].who}`).toBeGreaterThan(0.5)
    }
  })

  it('no two small things at idle are the same, within one customer or across them', () => {
    const prints = WHOS.flatMap((who) => Object.entries(SHEETS[who].idle).map(([idle, seconds]) => ({ name: `${who} ${idle}`, numbers: print(who, { idle }, seconds) })))
    expect(prints.length).toBeGreaterThanOrEqual(17)
    for (let a = 0; a < prints.length; a++) for (let b = a + 1; b < prints.length; b++) expect(distance(prints[a].numbers, prints[b].numbers), `${prints[a].name} against ${prints[b].name}`).toBeGreaterThan(0.5)
  })

  it('no two reactions of one customer are the same', () => {
    for (const who of WHOS) {
      const prints = REACTIONS.map((reaction) => ({ reaction, numbers: print(who, { react: reaction }, SHEETS[who].react[reaction]) }))
      for (let a = 0; a < prints.length; a++) for (let b = a + 1; b < prints.length; b++) expect(distance(prints[a].numbers, prints[b].numbers), `${who}: ${prints[a].reaction} against ${prints[b].reaction}`).toBeGreaterThan(0.5)
    }
  })

  it('sets the two twins, and the ants down the file, out of step with each other', () => {
    const twins = play(newActor('twins', 1), 3)
    expect(numbers(poseOf(twins, 0))).not.toEqual(numbers(poseOf(twins, 1)))
    const ants = play(newActor('ants', 1), 3)
    expect(new Set([0, 1, 2, 3].map((member) => poseOf(ants, member).bob.toFixed(3))).size).toBe(4)
  })
})
