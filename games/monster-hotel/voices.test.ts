import { describe, expect, it } from 'vitest'
import { GUEST_IDS } from './guests'
import { AT_ITS_THING, FIXED, STEADY_BEAT, steady, GRUNT, GRUNTS, RANGE, TUBA_TUNE, atItsThing, buzz, duetBeat, grunt, hum, sigh, iceDial, lengthOf, lifted, sneeze, stoveDial, sweepTo, takesTo, tuba, wheelTurns, yawn, type Sound } from './voices'

const within = (value: number, [least, most]: readonly [number, number]) => value >= least && value <= most
function inRange(sound: Sound, name: string): void {
  expect(sound.length, name).toBeGreaterThan(0)
  for (const note of sound) {
    expect(within(note.pitch, RANGE.pitch), `${name}: pitch ${note.pitch}`).toBe(true)
    if (note.glide !== 0) expect(within(note.glide, RANGE.pitch), `${name}: glide ${note.glide}`).toBe(true)
    expect(within(note.peak, RANGE.peak), `${name}: peak ${note.peak}`).toBe(true)
    expect(within(note.attack, RANGE.attack), `${name}: attack ${note.attack}`).toBe(true)
    expect(within(note.length, RANGE.length), `${name}: length ${note.length}`).toBe(true)
    expect(within(note.q, RANGE.q), `${name}: q ${note.q}`).toBe(true)
    expect(note.at, name).toBeGreaterThanOrEqual(0)
  }
  expect(lengthOf(sound), `${name}: whole length`).toBeLessThanOrEqual(RANGE.total)
}

describe('every voice is numbers inside the stated ranges', () => {
  it('the fixed sounds', () => {
    for (const [name, sound] of Object.entries(FIXED)) inRange(sound, name)
  })

  it('every grunt of every guest, wherever and however fast the finger lands, awake or asleep', () => {
    for (const id of GUEST_IDS) {
      for (let variant = 0; variant < GRUNTS; variant++) {
        for (const where of [0, 0.5, 1]) for (const speed of [0, 1]) for (const awake of [true, false]) {
          const sound = grunt(id, variant, where, speed, awake)
          inRange(sound, `${id} grunt ${variant}`)
          expect(lengthOf(sound), id).toBeLessThanOrEqual(0.9)
        }
      }
      inRange(sweepTo(id), `${id} sweep`)
      inRange(lifted(id), `${id} lifted`)
    }
    for (const id of GUEST_IDS) {
      for (const how of ['hugs', 'sits-and-sags', 'armchair', 'plank'] as const) inRange(takesTo(id, how), `${id} ${how}`)
      inRange(sneeze(id), `${id} sneezes`)
      inRange(sigh(id), `${id} sighs`)
      expect(lengthOf(sigh(id)) + 0.5, id).toBeLessThanOrEqual(RANGE.total)
      // A sneeze comes after the whumpf of the feathers, and still ends inside one voice.
      expect(lengthOf(sneeze(id)) + 0.75, id).toBeLessThanOrEqual(RANGE.total)
      inRange(yawn(id), `${id} yawns`)
    }
    for (const step of [1, 2, 3]) {
      inRange(stoveDial(step), `stove dial ${step}`)
      inRange(iceDial(step), `ice dial ${step}`)
    }
    for (const heard of ['plain', 'loved', 'minded', 'faint'] as const) inRange(buzz(heard), `the fly's buzz ${heard}`)
    for (const step of [0, 1]) inRange(duetBeat(step), `duet beat ${step}`)
    for (let step = 0; step < TUBA_TUNE.length; step++) for (const heard of ['plain', 'loved'] as const) { const sound = hum(step, heard); expect(sound === null).toBe(TUBA_TUNE[step] === null); if (sound) inRange(sound, `hum ${step}`) }
    inRange(wheelTurns('day'), 'wheel to day')
    inRange(wheelTurns('night'), 'wheel to night')
  })

  it('the tuba, every step, however it is heard', () => {
    for (let step = 0; step < TUBA_TUNE.length; step++) {
      for (const heard of ['plain', 'loved', 'minded', 'faint'] as const) {
        const sound = tuba(step, heard)
        expect(sound === null).toBe(TUBA_TUNE[step] === null)
        if (sound) inRange(sound, `tuba ${step} ${heard}`)
      }
    }
    expect(TUBA_TUNE.filter((step) => step === null).length).toBeGreaterThanOrEqual(2)
  })
})

describe('awake and at its one thing, each guest has a sound of its own', () => {
  it('every guest either makes a noise as its one thing or has a small sound of being at it, no two alike and none at the same tempo', () => {
    const noisy = ['troll', 'singer', 'fly']
    const seen = new Set<string>()
    for (const id of GUEST_IDS) {
      const sound = atItsThing(id, 0, 'plain')
      expect(sound === null, id).toBe(noisy.includes(id))
      expect(AT_ITS_THING[id] === undefined, id).toBe(noisy.includes(id))
      if (!sound) continue
      for (const nth of [0, 1]) for (const heard of ['plain', 'faint'] as const) inRange(atItsThing(id, nth, heard)!, `${id} at its thing`)
      seen.add(JSON.stringify(sound))
    }
    expect(seen.size).toBe(GUEST_IDS.length - noisy.length)
    expect(new Set(Object.values(AT_ITS_THING)).size).toBe(Object.values(AT_ITS_THING).length)
  })
})

describe('what stands somewhere keeps sounding', () => {
  it('the rumble, the hum with its drip, the tick, the tock, the whoosh and the patter are six different sounds in range, each at its own tempo', () => {
    const kinds = Object.keys(STEADY_BEAT) as (keyof typeof STEADY_BEAT)[]
    for (const kind of kinds) for (const nth of [0, 1, 2, 3]) for (const heard of ['plain', 'faint'] as const) inRange(steady(kind, nth, heard), `steady ${kind}`)
    expect(new Set(kinds.map((kind) => JSON.stringify(steady(kind, 1, 'plain')))).size).toBe(kinds.length)
    expect(new Set(Object.values(STEADY_BEAT)).size).toBe(kinds.length)
    // The ice box drips now and then, not on every round of its hum.
    expect([0, 1, 2, 3].map((nth) => steady('hum', nth, 'plain').length)).toEqual([3, 2, 2, 3])
  })
})

describe('every cell of the grid has a sound of its own', () => {
  it('no two fixed sounds are the same list of notes, and there is one for every way of using a thing', () => {
    const seen = new Map<string, string>()
    for (const [name, sound] of Object.entries(FIXED)) {
      const key = JSON.stringify(sound)
      expect(seen.get(key), `${name} sounds exactly like ${seen.get(key)}`).toBeUndefined()
      seen.set(key, name)
    }
    for (const name of ['quiltOnBed', 'wraps', 'quiltHangs', 'feathers', 'pipeStands', 'trumpet', 'pipeJoins', 'toots', 'stoveWarms', 'stoveScorches', 'iceChills', 'iceFrosts', 'clockByBed', 'clockKept', 'clockShruggedOff', 'clockOnWall', 'clockRings']) expect(FIXED[name], name).toBeDefined()
  })

  it('the dials say their step: a higher flame roars longer and louder, and the ice box chinks once for each icicle', () => {
    expect(stoveDial(3)[1].length).toBeGreaterThan(stoveDial(1)[1].length)
    expect(stoveDial(3)[1].peak).toBeGreaterThan(stoveDial(1)[1].peak)
    expect([iceDial(1).length, iceDial(2).length, iceDial(3).length]).toEqual([1, 2, 3])
  })
})

describe('each guest has a voice of its own', () => {
  it('no two guests share a pitch, a length or a wave-and-pitch pair, and their pitches are well apart', () => {
    const pitches = GUEST_IDS.map((id) => GRUNT[id].pitch).sort((a, b) => a - b)
    for (let i = 1; i < pitches.length; i++) expect(pitches[i] / pitches[i - 1]).toBeGreaterThan(1.15)
    expect(new Set(GUEST_IDS.map((id) => GRUNT[id].length)).size).toBe(GUEST_IDS.length)
  })

  it('a guest grunts three ways, higher when the finger lands on its head and shorter when the finger comes fast', () => {
    for (const id of GUEST_IDS) {
      const ways = [0, 1, 2].map((variant) => grunt(id, variant, 0.5, 0.5)[0].pitch)
      expect(new Set(ways.map((pitch) => pitch.toFixed(2))).size, id).toBe(3)
      expect(grunt(id, 0, 1, 0.5)[0].pitch).toBeGreaterThan(grunt(id, 0, 0, 0.5)[0].pitch)
      expect(grunt(id, 0, 0.5, 1)[0].length).toBeLessThan(grunt(id, 0, 0.5, 0)[0].length)
      // Asleep it is a snort: lower and longer.
      expect(grunt(id, 0, 0.5, 0.5, false)[0].pitch).toBeLessThan(grunt(id, 0, 0.5, 0.5, true)[0].pitch)
      expect(grunt(id, 0, 0.5, 0.5, false)[0].length).toBeGreaterThan(grunt(id, 0, 0.5, 0.5, true)[0].length)
    }
  })

  it('the same touch always gives the same sound', () => {
    expect(grunt('bat', 1, 0.3, 0.7)).toEqual(grunt('bat', 1, 0.3, 0.7))
  })
})

describe('the hotel as each guest hears it', () => {
  it('the same step of the tuba is a round tune to one and a flat blare to another', () => {
    const loved = tuba(0, 'loved')!, minded = tuba(0, 'minded')!, faint = tuba(0, 'faint')!, plain = tuba(0, 'plain')!
    // Loved: on pitch, soft-edged. Minded: flat, harsh and cut short. Faint: far quieter than either.
    expect(loved[0].wave).toBe('triangle')
    expect(minded[0].wave).toBe('sawtooth')
    expect(minded[0].pitch).toBeLessThan(loved[0].pitch)
    expect(minded[0].pitch / loved[0].pitch).toBeGreaterThan(0.96)
    expect(minded[0].length).toBeLessThan(loved[0].length)
    expect(faint[0].peak).toBeLessThan(loved[0].peak / 2)
    expect(plain[0].peak).toBeLessThan(loved[0].peak)
    expect(plain[0].peak).toBeGreaterThan(faint[0].peak)
  })
})
