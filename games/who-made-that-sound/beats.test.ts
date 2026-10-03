import { describe, expect, it } from 'vitest'
import { BREATH, type Cue, SCENE_SECONDS, choir, meeting, reunion, round, sceneSeconds, showing } from './beats'
import { FORMS } from './places'
import { reactionOf } from './tastes'
import { KINDS, type Kind, VOICES, callSeconds, nearOf } from './voices'

const pairs = KINDS.flatMap((a) => KINDS.filter((b) => b !== a).map((b) => [a, b] as [Kind, Kind]))

/** Every scene the game can play, with a name for the failure message. */
function every(): [string, Cue[]][] {
  const clutches: Kind[][] = [['pip', 'tok'], ['pip', 'hoom'], ['hoom', 'brrl', 'wheep'], ['hoom', 'brrl', 'dooo', 'tok'], ['wheep', 'dooo']]
  return [
    ...KINDS.map((kind) => [`reunion of ${kind}`, reunion(kind)] as [string, Cue[]]),
    ...pairs.map(([a, b]) => [`meeting of ${a} and ${b}`, meeting(a, b)] as [string, Cue[]]),
    ...clutches.map((found) => [`choir of ${found.join(' ')}`, choir(found)] as [string, Cue[]]),
    ...FORMS.flatMap((form) => KINDS.map((kind) => [`showing of ${form} by ${kind}`, showing(form, kind)] as [string, Cue[]])),
    ...KINDS.map((kind) => [`round of ${kind} and ${nearOf(kind)}`, round(kind, nearOf(kind))] as [string, Cue[]]),
  ]
}

const lengths = (name: string) => every().filter(([scene]) => scene.startsWith(name)).map(([, cues]) => sceneSeconds(cues))

describe('every short scene', () => {
  it('lasts between 4 and 10 seconds', () => {
    for (const [name, cues] of every()) {
      expect(sceneSeconds(cues), name).toBeGreaterThanOrEqual(SCENE_SECONDS[0])
      expect(sceneSeconds(cues), name).toBeLessThanOrEqual(SCENE_SECONDS[1])
    }
  })

  it('lasts what the design sheet says of its kind', () => {
    const within = (name: string, low: number, high: number) => {
      expect(Math.min(...lengths(name)), name).toBeGreaterThanOrEqual(low)
      expect(Math.max(...lengths(name)), name).toBeLessThanOrEqual(high)
    }
    within('reunion', 4, 7)
    within('meeting', 4, 6)
    within('choir', 4, 8)
    within('showing', 4, 9)
    within('round', 4, 8)
  })

  it('plays its cues in order, and no two calls sound at once unless they are meant to sound together', () => {
    for (const [name, cues] of every()) {
      for (let i = 1; i < cues.length; i++) expect(cues[i].at, name).toBeGreaterThanOrEqual(cues[i - 1].at)
      const calls = cues.filter((cue) => cue.cue === 'calls' || cue.cue === 'together')
      for (let i = 1; i < calls.length; i++) expect(calls[i].at, name).toBeGreaterThanOrEqual(calls[i - 1].at + calls[i - 1].lasts + BREATH - 1e-9)
      for (const cue of cues) expect(cue.lasts, name).toBeGreaterThan(0)
    }
  })

  it('gives every call the time its voice takes', () => {
    for (const [name, cues] of every()) for (const cue of cues) {
      if (cue.cue === 'calls') expect(cue.lasts, name).toBeGreaterThanOrEqual(callSeconds(VOICES[cue.who]))
      if (cue.cue === 'together') expect(cue.lasts, name).toBeGreaterThanOrEqual(Math.max(...cue.who.map((kind) => callSeconds(VOICES[kind]))))
    }
  })

  it('is filled in from the state of play: no two different states give the same scene', () => {
    const scenes = every().map(([, cues]) => JSON.stringify(cues))
    expect(new Set(scenes).size).toBe(scenes.length)
  })
})

describe('what each scene stars', () => {
  it('ends a reunion with the two sounding as one and going up the hill together', () => {
    for (const kind of KINDS) {
      const cues = reunion(kind).map((cue) => cue.cue)
      expect(cues).toEqual(['enters', 'calls', 'calls', 'together', 'joins', 'goesUp'])
    }
  })

  it('lets both be heard in a meeting that does not match, the one let out first, and then each react by its taste', () => {
    for (const [asker, other] of pairs) {
      const cues = meeting(asker, other)
      expect(cues.map((cue) => cue.cue)).toEqual(['enters', 'calls', 'calls', 'reacts', 'reacts', 'goesUp'])
      expect(cues[1]).toMatchObject({ who: other, inside: false })
      expect(cues[2]).toMatchObject({ who: asker, inside: false })
      expect(cues[3]).toMatchObject({ who: asker, to: other, how: reactionOf(asker, other) })
      expect(cues[4]).toMatchObject({ who: other, to: asker, how: reactionOf(other, asker) })
      // The two react at the same moment.
      expect(cues[3].at).toBe(cues[4].at)
      expect(cues[5]).toMatchObject({ who: other })
    }
  })

  it('has the choir sing in the order the child found them, then all together, and only then shows who waits next', () => {
    const found: Kind[] = ['wheep', 'pip', 'brrl']
    const cues = choir(found)
    expect(cues.filter((cue) => cue.cue === 'calls').map((cue) => (cue as Extract<Cue, { cue: 'calls' }>).who)).toEqual(found)
    expect(cues[cues.length - 2]).toMatchObject({ cue: 'together', who: found })
    expect(cues[cues.length - 1].cue).toBe('nextAppears')
  })

  it('shows two taps, a hearing and then an opening, in every way of asking', () => {
    for (const form of FORMS) for (const kind of KINDS) {
      const cues = showing(form, kind)
      expect(cues.filter((cue) => cue.cue === 'taps')).toHaveLength(2)
      const inside = cues.filter((cue) => cue.cue === 'calls').map((cue) => (cue as Extract<Cue, { cue: 'calls' }>).inside)
      // Both voices are heard before the first tap and again after it: one from inside, one in the open.
      expect(inside.filter(Boolean)).toHaveLength(2)
      expect(inside.filter((one) => !one)).toHaveLength(2)
    }
  })
})
