import { describe, expect, it } from 'vitest'
import { CELLS, GRID } from './grid'
import { ACTIONS, KINDS } from './things'
import { LIMITS, honk, lengthOf, spurt, type VoiceSpec } from './voices'
import {
  YARD_VARIANTS,
  YARD_VOICE_IDS,
  beeBuzz,
  beeLands,
  bellRing,
  catPurr,
  cellVoice,
  drip,
  duckQuack,
  duckTapsFloor,
  gateSwings,
  onPlastic,
  petalOpens,
  showSpit,
  snailGlides,
  steamFades,
  truckRolls,
  wormPops,
} from './yardVoices'

const FULLNESS = [0, 0.5, 1]
const VARIANTS = [0, 1, 2]

/** Every cell voice, at every fullness and variant the test looks at. */
function everyCellVoice(): [string, VoiceSpec][] {
  return YARD_VOICE_IDS.flatMap((id) => FULLNESS.flatMap((full) => VARIANTS.map((variant): [string, VoiceSpec] => [`${id} ${full} ${variant}`, cellVoice(id, full, variant)])))
}

/** Every voice of an animal, the gate or a scene, across its whole range and a little past each end. */
function everySceneVoice(): [string, VoiceSpec][] {
  const voices: [string, VoiceSpec][] = [
    ['gateSwings', gateSwings()],
    ['duckTapsFloor', duckTapsFloor()],
    ['beeBuzz rising', beeBuzz(true)],
    ['beeBuzz level', beeBuzz(false)],
    ['beeLands', beeLands()],
    ['snailGlides', snailGlides()],
    ['wormPops', wormPops()],
    ['steamFades', steamFades()],
    ['catPurr', catPurr()],
    ['showSpit', showSpit()],
  ]
  for (const ring of [-2, 0, 1, 2, 3, 4, 40]) voices.push([`bellRing ${ring}`, bellRing(ring)])
  for (const step of [-3, -1, 0, 1, 2, 3, 4, 5, 60]) voices.push([`truckRolls ${step}`, truckRolls(step)], [`petalOpens ${step}`, petalOpens(step)])
  for (const variant of [-4, -1, 0, 1, 2, 3, 17]) voices.push([`duckQuack ${variant}`, duckQuack(variant)], [`drip ${variant}`, drip(variant)], [`onPlastic ${variant}`, onPlastic(variant)])
  return voices
}

/** One voice of each animal, gate and scene sound, to tell them apart by. */
function oneOfEachSceneVoice(): [string, VoiceSpec][] {
  const voices: [string, VoiceSpec][] = [
    ['gateSwings', gateSwings()],
    ['truckRolls 0', truckRolls(0)],
    ['truckRolls 1', truckRolls(1)],
    ['duckQuack', duckQuack(0)],
    ['duckTapsFloor', duckTapsFloor()],
    ['beeBuzz rising', beeBuzz(true)],
    ['beeBuzz level', beeBuzz(false)],
    ['beeLands', beeLands()],
    ['snailGlides', snailGlides()],
    ['wormPops', wormPops()],
    ['steamFades', steamFades()],
    ['drip', drip(0)],
    ['catPurr', catPurr()],
    ['showSpit', showSpit()],
    ['onPlastic', onPlastic(0)],
  ]
  for (const ring of [1, 2, 3]) voices.push([`bellRing ${ring}`, bellRing(ring)])
  for (const step of [0, 1, 2, 3, 4]) voices.push([`petalOpens ${step}`, petalOpens(step)])
  return voices
}

/** Holds one voice inside every stated range. */
function expectInsideLimits(name: string, voice: VoiceSpec): void {
  expect(voice.length, name).toBeGreaterThan(0)
  expect(voice.length, name).toBeLessThanOrEqual(LIMITS.partials)
  for (const partial of voice) {
    for (const pitch of [partial.frequency, partial.glideTo ?? partial.frequency]) {
      expect(pitch, name).toBeGreaterThanOrEqual(LIMITS.frequency[0])
      expect(pitch, name).toBeLessThanOrEqual(LIMITS.frequency[1])
    }
    expect(partial.peak, name).toBeGreaterThanOrEqual(LIMITS.peak[0])
    expect(partial.peak, name).toBeLessThanOrEqual(LIMITS.peak[1])
    expect(partial.attack, name).toBeGreaterThanOrEqual(LIMITS.attack[0])
    expect(partial.attack, name).toBeLessThanOrEqual(LIMITS.attack[1])
    expect(partial.decay, name).toBeGreaterThanOrEqual(LIMITS.decay[0])
    expect(partial.decay, name).toBeLessThanOrEqual(LIMITS.decay[1])
    expect(partial.at, name).toBeGreaterThanOrEqual(0)
    if (partial.kind === 'tone') expect(partial.wave, name).toBeDefined()
    else expect(partial.q, name).toBeGreaterThan(0)
  }
  expect(loudnessOf(voice), name).toBeLessThanOrEqual(LIMITS.loudest + 1e-9)
  expect(lengthOf(voice), name).toBeLessThanOrEqual(LIMITS.longestS + 1e-9)
}

/** How loud a voice can get: every partial at its peak at once. */
function loudnessOf(voice: VoiceSpec): number {
  return voice.reduce((sum, partial) => sum + partial.peak, 0)
}

/** What a voice is made of, coarsely: two voices with the same signature would sound alike. */
function signatureOf(voice: VoiceSpec): string {
  const parts = voice.map((partial) => {
    const glide = partial.glideTo === undefined || partial.glideTo === partial.frequency ? 'level' : partial.glideTo > partial.frequency ? 'up' : 'down'
    return `${partial.kind} ${Math.round(partial.frequency / 10) * 10} ${glide}`
  })
  return `${parts.join(', ')}; ${lengthOf(voice).toFixed(2)} s`
}

/** The pitch a voice starts on. */
const firstPitch = (voice: VoiceSpec) => voice[0].frequency

describe('every voice of the grid', () => {
  it('has one for each of the 35 cells, named in grid order', () => {
    expect(YARD_VOICE_IDS).toHaveLength(35)
    expect(YARD_VOICE_IDS).toEqual(CELLS.map((cell) => cell.voice))
    expect(new Set(YARD_VOICE_IDS).size).toBe(35)
    for (const id of YARD_VOICE_IDS) expect(cellVoice(id).length, id).toBeGreaterThan(0)
  })

  it('stays inside the stated ranges at every fullness and variant', () => {
    const voices = everyCellVoice()
    expect(voices).toHaveLength(35 * FULLNESS.length * VARIANTS.length)
    for (const [name, voice] of voices) expectInsideLimits(name, voice)
  })

  it('is the same voice for the same cell, fullness and variant', () => {
    for (const id of YARD_VOICE_IDS) expect(cellVoice(id, 0.5, 1), id).toEqual(cellVoice(id, 0.5, 1))
  })

  it('sounds different in every one of the 35 cells', () => {
    const signatures = new Map<string, string>()
    for (const id of YARD_VOICE_IDS) {
      const signature = signatureOf(cellVoice(id, 0, 0))
      expect(signatures.get(signature), `${id} sounds like another cell`).toBeUndefined()
      signatures.set(signature, id)
    }
    expect(signatures.size).toBe(35)
  })

  it('starts the five results of one thing far apart, so they are easy to tell apart by ear', () => {
    for (const kind of KINDS) {
      const row = ACTIONS.map((action) => ({ id: GRID[kind][action].voice, first: cellVoice(GRID[kind][action].voice, 0, 0)[0] }))
      for (const a of row) {
        for (const b of row) {
          if (a.id >= b.id || a.first.kind !== b.first.kind) continue
          const apart = Math.abs(a.first.frequency - b.first.frequency) / Math.min(a.first.frequency, b.first.frequency)
          expect(apart, `${kind}: ${a.id} and ${b.id}`).toBeGreaterThan(0.12)
        }
      }
    }
  })

  it('has three variants of every cell that differ in pitch', () => {
    expect(YARD_VARIANTS).toBe(3)
    for (const id of YARD_VOICE_IDS) {
      for (const full of FULLNESS) {
        const pitches = new Set(VARIANTS.map((variant) => Math.round(firstPitch(cellVoice(id, full, variant)))))
        expect(pitches.size, `${id} ${full}`).toBe(3)
      }
    }
  })

  it('takes a variant number of any size or sign, and any fullness', () => {
    for (const id of YARD_VOICE_IDS) {
      expect(cellVoice(id, 0, 3), id).toEqual(cellVoice(id, 0, 0))
      expect(cellVoice(id, 0, 301), id).toEqual(cellVoice(id, 0, 1))
      expect(cellVoice(id, 0, -1), id).toEqual(cellVoice(id, 0, 2))
      expect(cellVoice(id, 0, -299), id).toEqual(cellVoice(id, 0, 1))
      expect(cellVoice(id, 0, 1.2), id).toEqual(cellVoice(id, 0, 1))
      expect(cellVoice(id, 7, 0), id).toEqual(cellVoice(id, 1, 0))
      expect(cellVoice(id, -2, 0), id).toEqual(cellVoice(id, 0, 0))
      expect(cellVoice(id, Number.NaN, Number.NaN), id).toEqual(cellVoice(id, 0, 0))
      expect(cellVoice(id), id).toEqual(cellVoice(id, 0, 0))
    }
  })

  it('answers a voice it does not know with a soft pat, and never throws', () => {
    for (const id of ['', 'no-such-voice', 'constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      for (const full of FULLNESS) for (const variant of VARIANTS) expectInsideLimits(`unknown "${id}"`, cellVoice(id, full, variant))
      expect(cellVoice(id), id).toEqual(cellVoice('no-such-voice'))
    }
    const pat = cellVoice('no-such-voice')
    expect(loudnessOf(pat)).toBeLessThan(loudnessOf(cellVoice('pat')))
    expect(lengthOf(pat)).toBeLessThan(0.2)
  })
})

describe('what a thing already holds', () => {
  it('makes the pool splash deeper as it fills', () => {
    for (const variant of VARIANTS) {
      const empty = cellVoice('splash-deep', 0, variant), half = cellVoice('splash-deep', 0.5, variant), full = cellVoice('splash-deep', 1, variant)
      full.forEach((partial, at) => {
        expect(partial.frequency).toBeLessThan(half[at].frequency)
        expect(half[at].frequency).toBeLessThan(empty[at].frequency)
      })
      expect(lengthOf(full)).toBeGreaterThan(lengthOf(empty))
    }
  })

  it('steps the seed up in pitch with each stage, and the open flower is higher still', () => {
    for (const variant of VARIANTS) {
      const stages = [0, 1 / 3, 2 / 3, 1].map((full) => firstPitch(cellVoice('pluck', full, variant)))
      for (let stage = 1; stage < stages.length; stage++) expect(stages[stage]).toBeGreaterThan(stages[stage - 1] * 1.1)
      expect(firstPitch(cellVoice('pluck', 1, variant))).toBeGreaterThan(firstPitch(cellVoice('pluck', 0, variant)))
      expect(firstPitch(cellVoice('pluck-high', 1, variant))).toBeGreaterThan(firstPitch(cellVoice('pluck-high', 0, variant)))
      for (const full of [0, 1 / 3, 2 / 3, 1]) expect(firstPitch(cellVoice('pluck-high', full, variant))).toBeGreaterThan(firstPitch(cellVoice('pluck', full, variant)) * 1.12)
    }
    // A later stage is higher than an earlier one whichever variants the two happen to get.
    const lowest = (full: number) => Math.min(...VARIANTS.map((variant) => firstPitch(cellVoice('pluck', full, variant))))
    const highest = (full: number) => Math.max(...VARIANTS.map((variant) => firstPitch(cellVoice('pluck', full, variant))))
    expect(lowest(1 / 3)).toBeGreaterThan(highest(0))
    expect(lowest(2 / 3)).toBeGreaterThan(highest(1 / 3))
    expect(lowest(1)).toBeGreaterThan(highest(2 / 3))
  })

  it('plucks with a fast attack on a triangle tone', () => {
    for (const id of ['pluck', 'pluck-high']) {
      const [pluck] = cellVoice(id)
      expect(pluck.kind).toBe('tone')
      expect(pluck.wave).toBe('triangle')
      expect(pluck.attack).toBeLessThan(0.01)
    }
  })

  it('deepens the drumming in the boat gulp by gulp', () => {
    const empty = cellVoice('drumming-deeper', 0, 0), full = cellVoice('drumming-deeper', 1, 0)
    full.forEach((partial, at) => expect(partial.frequency).toBeLessThan(empty[at].frequency))
  })

  it('hisses shorter and thinner on a smaller flame', () => {
    const tall = cellVoice('hiss-short', 0, 0), small = cellVoice('hiss-short', 1, 0)
    expect(lengthOf(small)).toBeLessThan(lengthOf(tall))
    expect(loudnessOf(small)).toBeLessThan(loudnessOf(tall))
    expect(small[0].q!).toBeGreaterThan(tall[0].q!)
    expect(loudnessOf(cellVoice('fft', 1, 0))).toBeLessThan(loudnessOf(cellVoice('fft', 0, 0)))
  })

  it('rattles a dry pool like a drum and slaps a full one', () => {
    const dry = cellVoice('light-slaps', 0, 0), wet = cellVoice('light-slaps', 1, 0)
    expect(dry).toHaveLength(4)
    expect(dry[0].frequency).toBeLessThan(wet[0].frequency)
    expect(dry[0].q!).toBeGreaterThan(wet[0].q!)
    expect(wet[0].frequency).toBeGreaterThan(800)
    expect(wet[0].frequency).toBeLessThan(1300)
  })
})

describe('the timbres of the grid', () => {
  it('hisses with wide noise that falls, and the fire going out is the longest hiss', () => {
    for (const id of ['hiss-short', 'hiss-falling']) {
      const [hiss] = cellVoice(id)
      expect(hiss.kind).toBe('noise')
      expect(hiss.q!).toBeLessThan(1)
      expect(hiss.glideTo!).toBeLessThan(hiss.frequency)
    }
    expect(lengthOf(cellVoice('hiss-falling'))).toBeGreaterThan(lengthOf(cellVoice('hiss-short')) * 2)
  })

  it('knocks wood between 300 and 500 Hz, very short', () => {
    for (const id of ['wood-knock', 'hull-knock']) {
      const [knock] = cellVoice(id)
      expect(knock.kind).toBe('tone')
      expect(knock.frequency).toBeGreaterThanOrEqual(300)
      expect(knock.frequency).toBeLessThanOrEqual(500)
      expect(knock.decay).toBeLessThanOrEqual(0.06)
    }
  })

  it('gurgles and glugs low, in bumps that each bend upward one after another', () => {
    for (const id of ['gurgle-over', 'glug']) {
      const bumps = cellVoice(id).filter((partial) => partial.kind === 'tone' && partial.frequency < 200)
      expect(bumps.length, id).toBe(3)
      expect(new Set(bumps.map((bump) => bump.at)).size, id).toBe(3)
      for (const bump of bumps) expect(bump.glideTo!, id).toBeGreaterThan(bump.frequency)
    }
  })

  it('ticks the ratchet in short high clicks that slow down', () => {
    const clicks = cellVoice('ratchet')
    expect(clicks).toHaveLength(4)
    for (const click of clicks) {
      expect(click.kind).toBe('noise')
      expect(click.frequency).toBeGreaterThan(2500)
      expect(click.decay).toBeLessThanOrEqual(0.04)
    }
    const gaps = clicks.slice(1).map((click, at) => click.at - clicks[at].at)
    expect(gaps[1]).toBeGreaterThan(gaps[0])
    expect(gaps[2]).toBeGreaterThan(gaps[1])
  })

  it('whirrs in a narrow band that rises, and whistles in a tone that glides up high', () => {
    const [whirr] = cellVoice('whirr-rising')
    expect(whirr.kind).toBe('noise')
    expect(whirr.q!).toBeGreaterThanOrEqual(6)
    expect(whirr.q!).toBeLessThanOrEqual(10)
    expect(whirr.glideTo!).toBeGreaterThan(whirr.frequency)
    const [whistle] = cellVoice('whistle')
    expect(whistle.wave).toBe('sine')
    expect(whistle.glideTo!).toBeGreaterThan(2000)
    expect(whistle.glideTo!).toBeGreaterThan(whistle.frequency)
  })

  it('creaks and slurps slowly and quietly, falling', () => {
    const [creak] = cellVoice('slow-creak')
    expect(creak.wave).toBe('triangle')
    const [slurp] = cellVoice('quiet-slurp')
    expect(slurp.kind).toBe('noise')
    expect(slurp.q!).toBeGreaterThan(4)
    for (const slow of [creak, slurp]) {
      expect(slow.glideTo!).toBeLessThan(slow.frequency)
      expect(slow.attack + slow.decay).toBeGreaterThan(0.4)
      expect(slow.peak).toBeLessThanOrEqual(0.05)
    }
  })

  it('gives the cat a short rising squeak, a short hiss, a sneeze and a rattle of drops', () => {
    const [squeak] = cellVoice('squeak')
    expect(squeak.wave).toBe('sine')
    expect(squeak.frequency).toBeGreaterThan(1000)
    expect(squeak.glideTo!).toBeGreaterThan(squeak.frequency)
    expect(lengthOf(cellVoice('squeak'))).toBeLessThan(0.15)

    const [hiss] = cellVoice('hiss-cat')
    expect(hiss.kind).toBe('noise')
    expect(hiss.frequency).toBeGreaterThan(2500)
    expect(lengthOf(cellVoice('hiss-cat'))).toBeLessThan(0.3)

    const sneeze = cellVoice('sneeze')
    expect(sneeze.map((partial) => partial.kind)).toEqual(['noise', 'tone'])
    expect(sneeze[1].at).toBeGreaterThan(sneeze[0].at)
    expect(sneeze[1].frequency).toBeGreaterThan(1500)

    const clicks = cellVoice('rattle-and-grumble').filter((partial) => partial.kind === 'noise')
    expect(clicks.length).toBeGreaterThanOrEqual(3)
    for (const click of clicks) expect(click.decay).toBeLessThanOrEqual(0.04)
    expect(clicks[clicks.length - 1].at - clicks[0].at).toBeLessThan(0.15)
    const grumble = cellVoice('rattle-and-grumble').find((partial) => partial.kind === 'tone')!
    expect(grumble.frequency).toBeLessThan(120)
    expect(grumble.at).toBeGreaterThan(clicks[clicks.length - 1].at)
  })

  it('tinkles high and then bloops low and rising', () => {
    const voice = cellVoice('tinkle-bloop')
    const tinkles = voice.filter((partial) => partial.frequency >= 2000)
    expect(tinkles).toHaveLength(3)
    for (const tinkle of tinkles) {
      expect(tinkle.frequency).toBeLessThanOrEqual(3000)
      expect(tinkle.decay).toBeLessThan(0.1)
    }
    const bloop = voice[voice.length - 1]
    expect(bloop.at).toBeGreaterThan(tinkles[2].at)
    expect(bloop.glideTo!).toBeGreaterThan(bloop.frequency)
    expect(bloop.frequency).toBeLessThan(400)
  })

  it('bonks hollow plastic with a low tone that falls at once and a short tick', () => {
    const [bonk, tick] = cellVoice('bonk')
    expect(bonk.wave).toBe('sine')
    expect(bonk.frequency).toBeLessThan(300)
    expect(bonk.glideTo!).toBeLessThan(bonk.frequency)
    expect(tick.kind).toBe('noise')
    expect(tick.decay).toBeLessThanOrEqual(0.04)
  })

  it('slaps the boat near 1 kHz, short', () => {
    const [slap] = cellVoice('side-slap')
    expect(slap.kind).toBe('noise')
    expect(slap.frequency).toBeGreaterThan(800)
    expect(slap.frequency).toBeLessThan(1300)
    expect(slap.decay).toBeLessThanOrEqual(0.06)
  })
})

describe('how loud the yard is', () => {
  it('has no cell louder than the horn of the truck', () => {
    const horn = loudnessOf(honk())
    for (const [name, voice] of everyCellVoice()) expect(loudnessOf(voice), name).toBeLessThanOrEqual(horn + 1e-9)
    for (const [name, voice] of everySceneVoice()) expect(loudnessOf(voice), name).toBeLessThanOrEqual(horn + 1e-9)
  })

  it('keeps the cat and the bee among the quieter half, so no animal is startling', () => {
    const loudness = YARD_VOICE_IDS.map((id) => loudnessOf(cellVoice(id, 0, 0))).sort((a, b) => a - b)
    const middle = loudness[Math.floor(loudness.length / 2)]
    for (const action of ACTIONS) {
      const id = GRID.cat[action].voice
      for (const full of FULLNESS) expect(loudnessOf(cellVoice(id, full, 0)), id).toBeLessThanOrEqual(middle)
    }
    for (const [name, voice] of [['catPurr', catPurr()], ['beeBuzz rising', beeBuzz(true)], ['beeBuzz level', beeBuzz(false)], ['beeLands', beeLands()]] as const) {
      expect(loudnessOf(voice), name).toBeLessThanOrEqual(middle)
    }
  })

  it('keeps the high sounds soft: nothing above 2 kHz is as loud as a low one may be', () => {
    for (const [name, voice] of [...everyCellVoice(), ...everySceneVoice()]) {
      for (const partial of voice) if (partial.frequency > 2000) expect(partial.peak, name).toBeLessThanOrEqual(0.13)
    }
  })
})

describe('the animals, the gate and the scenes', () => {
  it('stay inside the stated ranges across their whole range', () => {
    for (const [name, voice] of everySceneVoice()) expectInsideLimits(name, voice)
  })

  it('all sound different from one another and from every cell', () => {
    const signatures = new Map<string, string>()
    for (const id of YARD_VOICE_IDS) signatures.set(signatureOf(cellVoice(id, 0, 0)), id)
    expect(signatures.size).toBe(35)
    const scene = oneOfEachSceneVoice()
    for (const [name, voice] of scene) {
      const signature = signatureOf(voice)
      expect(signatures.get(signature), `${name} sounds like another voice`).toBeUndefined()
      signatures.set(signature, name)
    }
    expect(signatures.size).toBe(35 + scene.length)
  })

  it('rings the bell clear, and each of the three rings a step higher than the last', () => {
    const rings = [1, 2, 3].map((ring) => bellRing(ring))
    for (const ring of rings) {
      const [bell, above] = ring
      expect(bell.wave).toBe('sine')
      expect(bell.frequency).toBeGreaterThanOrEqual(880)
      expect(bell.frequency).toBeLessThanOrEqual(1320)
      expect(bell.attack).toBeCloseTo(0.004, 6)
      expect(bell.decay).toBeCloseTo(0.5, 6)
      expect([1.5, 2]).toContain(Number((above.frequency / bell.frequency).toFixed(3)))
      expect(above.peak).toBeLessThan(bell.peak)
    }
    expect(firstPitch(rings[1])).toBeGreaterThan(firstPitch(rings[0]) * 1.05)
    expect(firstPitch(rings[2])).toBeGreaterThan(firstPitch(rings[1]) * 1.05)
    expect(bellRing(0)).toEqual(bellRing(1))
    expect(bellRing(-5)).toEqual(bellRing(1))
    expect(bellRing(4)).toEqual(bellRing(3))
    expect(bellRing(99)).toEqual(bellRing(3))
    expect(bellRing(Number.NaN)).toEqual(bellRing(1))
  })

  it('swings the gate with a creak that falls and a soft low bump at the end', () => {
    const gate = gateSwings()
    const [creak] = gate
    expect(creak.wave).toBe('triangle')
    expect(creak.glideTo!).toBeLessThan(creak.frequency)
    const bump = gate.filter((partial) => partial.kind === 'tone').sort((a, b) => b.at - a.at)[0]
    expect(bump.at).toBeGreaterThan(0.3)
    expect(bump.frequency).toBeLessThan(200)
  })

  it('rolls the truck on two pitches that take turns: low, soft and short', () => {
    const even = truckRolls(0), odd = truckRolls(1)
    expect(firstPitch(even)).not.toBe(firstPitch(odd))
    for (let step = -6; step <= 12; step++) expect(truckRolls(step), `step ${step}`).toEqual(step % 2 === 0 ? even : odd)
    expect(truckRolls(Number.NaN)).toEqual(even)
    for (const putt of [even, odd]) {
      expect(firstPitch(putt)).toBeLessThan(150)
      expect(loudnessOf(putt)).toBeLessThan(0.12)
      expect(lengthOf(putt)).toBeLessThan(0.15)
    }
  })

  it('quacks in two short nasal bumps that fall, between 500 and 700 Hz', () => {
    for (const variant of VARIANTS) {
      const quack = duckQuack(variant)
      expect(quack).toHaveLength(2)
      expect(quack[1].at).toBeGreaterThan(quack[0].at)
      for (const bump of quack) {
        expect(['square', 'triangle']).toContain(bump.wave)
        expect(bump.frequency).toBeGreaterThanOrEqual(500)
        expect(bump.frequency).toBeLessThanOrEqual(700)
        expect(bump.glideTo!).toBeLessThan(bump.frequency)
        expect(bump.decay).toBeLessThanOrEqual(0.1)
      }
    }
  })

  it('has variants of the quack, the drip and the patter on plastic that differ and wrap', () => {
    for (const make of [duckQuack, drip, onPlastic]) {
      expect(new Set(VARIANTS.map((variant) => Math.round(firstPitch(make(variant))))).size).toBe(3)
      expect(make(3)).toEqual(make(0))
      expect(make(-1)).toEqual(make(2))
      expect(make(Number.NaN)).toEqual(make(0))
    }
    expect(duckQuack()).toEqual(duckQuack(0))
    expect(drip()).toEqual(drip(0))
    expect(onPlastic()).toEqual(onPlastic(0))
  })

  it('taps the empty pool with two tiny ticks', () => {
    const ticks = duckTapsFloor().filter((partial) => partial.kind === 'noise')
    expect(ticks).toHaveLength(2)
    expect(ticks[1].at).toBeGreaterThan(ticks[0].at)
    for (const tick of ticks) expect(tick.decay).toBeLessThanOrEqual(0.04)
    expect(lengthOf(duckTapsFloor())).toBeLessThan(0.25)
  })

  it('buzzes level, and up when drops land on the bee', () => {
    const level = beeBuzz(false), rising = beeBuzz(true)
    for (const buzz of [level, rising]) {
      expect(buzz[0].frequency).toBeGreaterThanOrEqual(180)
      expect(buzz[0].frequency).toBeLessThanOrEqual(240)
      // The wobble: two partials a few Hz apart.
      const apart = Math.abs(buzz[1].frequency - buzz[0].frequency)
      expect(apart).toBeGreaterThan(2)
      expect(apart).toBeLessThan(15)
    }
    for (const partial of level) expect(partial.glideTo ?? partial.frequency).toBe(partial.frequency)
    for (const partial of rising) expect(partial.glideTo!).toBeGreaterThan(partial.frequency * 1.2)
  })

  it('lands the bee on two soft notes, the second lower', () => {
    const [first, second] = beeLands()
    expect(beeLands()).toHaveLength(2)
    expect(second.at).toBeGreaterThan(first.at)
    expect(second.frequency).toBeLessThan(first.frequency)
  })

  it('glides the snail gently up and then down, near 300 Hz', () => {
    const [up, down] = snailGlides()
    expect(up.wave).toBe('sine')
    expect(up.glideTo!).toBeGreaterThan(up.frequency)
    expect(down.at).toBeGreaterThan(up.at)
    expect(down.glideTo!).toBeLessThan(down.frequency)
    for (const partial of snailGlides()) {
      expect(partial.frequency).toBeGreaterThan(240)
      expect(partial.frequency).toBeLessThan(360)
      expect(partial.peak).toBeLessThanOrEqual(0.05)
    }
  })

  it('pops the worm up with a small rising bloop', () => {
    const [bloop] = wormPops()
    expect(bloop.wave).toBe('sine')
    expect(bloop.glideTo!).toBeGreaterThan(bloop.frequency * 1.5)
    expect(lengthOf(wormPops())).toBeLessThan(0.2)
  })

  it('fades the last of the steam over about 0.6 s, high and soft', () => {
    const steam = steamFades()
    expect(lengthOf(steam)).toBeGreaterThan(0.5)
    expect(lengthOf(steam)).toBeLessThan(0.7)
    for (const partial of steam) {
      expect(partial.kind).toBe('noise')
      expect(partial.frequency).toBeGreaterThan(2500)
      expect(partial.peak).toBeLessThanOrEqual(0.05)
    }
  })

  it('drips with a tiny high plink', () => {
    const [plink] = drip(0)
    expect(plink.frequency).toBeGreaterThan(1200)
    expect(lengthOf(drip(0))).toBeLessThan(0.1)
    expect(loudnessOf(drip(0))).toBeLessThan(0.1)
  })

  it('opens five petals, each a note higher than the last', () => {
    const petals = [0, 1, 2, 3, 4].map((step) => petalOpens(step))
    for (const petal of petals) expect(petal[0].wave).toBe('triangle')
    for (let step = 1; step < petals.length; step++) expect(firstPitch(petals[step])).toBeGreaterThan(firstPitch(petals[step - 1]) * 1.1)
    expect(petalOpens(-1)).toEqual(petalOpens(0))
    expect(petalOpens(5)).toEqual(petalOpens(4))
    expect(petalOpens(80)).toEqual(petalOpens(4))
    expect(petalOpens(Number.NaN)).toEqual(petalOpens(0))
  })

  it('purrs low and quiet, trembling between two close tones', () => {
    const [low, close] = catPurr()
    for (const partial of [low, close]) {
      expect(partial.wave).toBe('triangle')
      expect(partial.frequency).toBeGreaterThanOrEqual(70)
      expect(partial.frequency).toBeLessThanOrEqual(90)
    }
    const apart = Math.abs(close.frequency - low.frequency)
    expect(apart).toBeGreaterThan(2)
    expect(apart).toBeLessThan(12)
    expect(loudnessOf(catPurr())).toBeLessThan(0.12)
  })

  it('shows a new thing with a spit half as loud as the first gulp of a touch, and a little higher', () => {
    const [pop] = spurt()
    const [spit] = showSpit()
    expect(showSpit()).toHaveLength(1)
    expect(spit.peak).toBeCloseTo(pop.peak / 2, 6)
    expect(spit.frequency).toBeGreaterThan(pop.frequency)
    expect(spit.frequency).toBeLessThan(pop.frequency * 1.25)
    expect(spit.glideTo!).toBeGreaterThan(spit.frequency)
    expect(spit.wave).toBe(pop.wave)
  })

  it('patters on the truck itself, short and hollow', () => {
    const patter = onPlastic(0)
    expect(patter.some((partial) => partial.kind === 'noise')).toBe(true)
    expect(patter.some((partial) => partial.kind === 'tone' && partial.frequency < 400)).toBe(true)
    expect(lengthOf(patter)).toBeLessThan(0.2)
  })
})
