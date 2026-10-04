import { describe, expect, it } from 'vitest'
import { ACTORS, AT_REST, Director, actionOf, poseAt, type ActorId, type Channels } from './motion'

const WHO = Object.keys(ACTORS) as ActorId[]
const CHANNELS = Object.keys(AT_REST) as (keyof Channels)[]
const actions = WHO.flatMap((who) => [...Object.keys(ACTORS[who].idle), ...Object.keys(ACTORS[who].answer)].map((name) => ({ who, name })))

/** An action as numbers: every channel at 24 moments spread over its length. */
function sampled(who: ActorId, name: string): number[] {
  const seconds = actionOf(who, name)!.seconds, out: number[] = []
  for (let step = 1; step < 25; step++) {
    const pose = poseAt(who, name, (seconds * step) / 25)
    for (const channel of CHANNELS) out.push(pose[channel] / (channel === 'legs' ? 3 : 1))
  }
  return out
}

const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, at) => sum + (value - b[at]) ** 2, 0) / a.length)

describe('every character moves like itself', () => {
  it('has its own tempo, its own weight and its own funniest part', () => {
    expect(new Set(WHO.map((who) => ACTORS[who].tempo)).size).toBe(WHO.length)
    expect(new Set(WHO.map((who) => ACTORS[who].weight)).size).toBe(WHO.length)
    expect(new Set(WHO.map((who) => ACTORS[who].funniest)).size).toBe(WHO.length)
  })

  it('has at least three things it does by itself, and an answer to a touch', () => {
    for (const who of WHO) {
      expect(Object.keys(ACTORS[who].idle).length, who).toBeGreaterThanOrEqual(3)
      expect(Object.keys(ACTORS[who].answer).length, who).toBeGreaterThanOrEqual(2)
    }
  })

  it('shares no action with another character, by name or by motion', () => {
    const names = actions.map((one) => one.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('has no action that is another one with the numbers nudged', () => {
    for (let a = 0; a < actions.length; a++) {
      for (let b = a + 1; b < actions.length; b++) {
        const gap = distance(sampled(actions[a].who, actions[a].name), sampled(actions[b].who, actions[b].name))
        expect(gap, `${actions[a].name} against ${actions[b].name}`).toBeGreaterThan(0.06)
      }
    }
  })

  it('differs in length from action to action: nothing runs on one shared clock', () => {
    for (const who of WHO) {
      const lengths = [...Object.values(ACTORS[who].idle), ...Object.values(ACTORS[who].answer)].map((action) => action.seconds)
      expect(new Set(lengths).size, who).toBe(lengths.length)
    }
  })

  it('keeps each actor to its own channels: the worm never leans or flips, the beetle never rises from soil', () => {
    for (const { who, name } of actions) {
      const pose = sampled(who, name)
      const used = CHANNELS.filter((_, at) => pose.some((value, index) => index % CHANNELS.length === at && value !== 0))
      if (who === 'worm') expect(used.every((channel) => channel === 'rise' || channel === 'look'), name).toBe(true)
      else expect(used, name).not.toContain('rise')
    }
  })
})

describe('an action', () => {
  it('starts at rest and ends at rest, so one can follow another with no jump', () => {
    for (const { who, name } of actions) {
      const seconds = actionOf(who, name)!.seconds
      expect(poseAt(who, name, 0), name).toEqual(AT_REST)
      expect(poseAt(who, name, seconds), name).toEqual(AT_REST)
      expect(poseAt(who, name, seconds + 5), name).toEqual(AT_REST)
      expect(poseAt(who, name, -1), name).toEqual(AT_REST)
      const nearEnd = poseAt(who, name, seconds * 0.999)
      for (const channel of CHANNELS) expect(Math.abs(nearEnd[channel]), `${name} ${channel}`).toBeLessThan(0.05)
    }
  })

  it('moves: somewhere in it a channel is well away from rest', () => {
    for (const { who, name } of actions) expect(Math.max(...sampled(who, name).map(Math.abs)), name).toBeGreaterThan(0.15)
  })

  it('never jumps between two frames, except where a sneeze lets go, where the beetle goes over and where the worm goes in', () => {
    for (const { who, name } of actions) {
      const seconds = actionOf(who, name)!.seconds
      let before = poseAt(who, name, 0)
      for (let t = 1 / 60; t < seconds; t += 1 / 60) {
        const now = poseAt(who, name, t)
        for (const channel of CHANNELS) {
          if (channel === 'sneeze' || channel === 'flip' || channel === 'legs' || name === 'sneeze') continue
          // The worm is gone in a blink: going back into the soil may be as fast as it likes.
          const change = channel === 'rise' ? Math.max(0, now.rise - before.rise) : Math.abs(now[channel] - before[channel])
          expect(change, `${name} ${channel} at ${t.toFixed(2)}`).toBeLessThan(channel === 'rise' || channel === 'look' ? 0.2 : 0.16)
        }
        before = now
      }
    }
  })

  it('is the same pose for the same moment, and unknown names are rest', () => {
    expect(poseAt('beetle', 'flip', 0.7)).toEqual(poseAt('beetle', 'flip', 0.7))
    expect(poseAt('beetle', 'cartwheel', 0.7)).toEqual(AT_REST)
    expect(poseAt('worm', 'flip', 0.7)).toEqual(AT_REST)
  })

  it('gives the beetle weight: it swings past a pose on the way to it', () => {
    // Its first pose leans to -0.2; on the way there it goes past it.
    let deepest = 0
    for (let t = 0; t < 3.4 * 0.2; t += 1 / 120) deepest = Math.min(deepest, poseAt('beetle', 'smooth-tape', t).lean)
    expect(deepest).toBeLessThan(-0.21)
    // The worm has next to no weight: it arrives and stops.
    let highest = 0
    for (let t = 0; t < 3.6 * 0.3; t += 1 / 120) highest = Math.max(highest, poseAt('worm', 'periscope', t).rise)
    expect(highest).toBeLessThan(1.02)
  })

  it('lets the worm come up slowly and go back in a blink', () => {
    const action = actionOf('worm', 'periscope')!
    const up = action.keys[1].at * action.seconds
    const down = (action.keys[action.keys.length - 1].at - action.keys[action.keys.length - 2].at) * action.seconds
    expect(up).toBeGreaterThan(down * 3)
  })
})

describe('the director', () => {
  it('never picks the same idle action twice running, and picks every one in time', () => {
    for (const who of WHO) {
      const director = new Director(7)
      const seen = new Set<string>()
      let before = ''
      for (let pick = 0; pick < 200; pick++) {
        const name = director.next(who)
        expect(name).not.toBe(before)
        expect(Object.keys(ACTORS[who].idle)).toContain(name)
        seen.add(name)
        before = name
      }
      expect(seen.size).toBe(Object.keys(ACTORS[who].idle).length)
    }
  })

  it('waits within the actor’s own pause, and not the same wait every time', () => {
    for (const who of WHO) {
      const director = new Director(11), [least, most] = ACTORS[who].pause
      const waits = Array.from({ length: 50 }, () => director.pause(who))
      for (const wait of waits) expect(wait >= least && wait <= most).toBe(true)
      expect(new Set(waits.map((wait) => wait.toFixed(2))).size).toBeGreaterThan(20)
    }
  })

  it('makes the same choices for the same seed', () => {
    const a = new Director(3), b = new Director(3)
    for (let pick = 0; pick < 30; pick++) expect([a.next('beetle'), a.pause('worm')]).toEqual([b.next('beetle'), b.pause('worm')])
  })
})
