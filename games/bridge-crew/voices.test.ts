import { describe, expect, it } from 'vitest'
import { KINDS, SPEC } from './kit'
import { RANGE, scaleNote, reactVoice, growCreak, pendulumSqueak, beaverChatter, beaverSigh, beaverSlap, chord, creak, fold, give, gurgle, hornEcho, lay, load, moleDrop, moleRule, pendulum, pinClick, pinPop, pinRattle, pinSwing, pinTick, plop, play, pluck, snapTick, splash, takeOff, trolleyBells, trolleyFlip, trolleyOff, trolleySet, trolleyWeight, turn, type VoiceSpec } from './voices'

const every: [string, VoiceSpec][] = [
  ['pin', pinClick],
  ...KINDS.flatMap((kind): [string, VoiceSpec][] => [1, 2.5, SPEC[kind].maxLength].flatMap((long): [string, VoiceSpec][] => [
    [`lay ${kind} ${long}`, lay(kind, long)], [`snap ${kind} ${long}`, snapTick(kind, long)], [`turn ${kind} ${long}`, turn(kind, long)], [`off ${kind} ${long}`, takeOff(kind, long)],
    ...[-99, -3, 0, 3, 99].map((force): [string, VoiceSpec] => [`pluck ${kind} ${long} ${force}`, pluck(kind, force, long, false)]),
    [`pluck slack ${kind}`, pluck(kind, 0, long, true)],
  ])),
  ...[0, 0.5, 1, 3].map((use): [string, VoiceSpec] => [`creak ${use}`, creak(use)]),
  ...KINDS.flatMap((kind) => (['bend', 'bow', 'squeeze', 'pull'] as const).map((how): [string, VoiceSpec] => [`give ${kind} ${how}`, give(how, kind)])),
  ...[0, 1, 4, 40].flatMap((n): [string, VoiceSpec][] => [[`fold ${n}`, fold(n)], [`splash ${n}`, splash(n)], [`bells ${n}`, trolleyBells(n)]]),
  ['chord', chord([9000, 20, 440, 330, 550, 660, 770])],
  ...KINDS.flatMap((kind) => [-1, 0, 0.5, 1, 9].map((use): [string, VoiceSpec] => [`load ${kind} ${use}`, load(kind, use)])),
  ['plop', plop], ['gurgle', gurgle], ['horn echo', hornEcho],
  ['squeak', pendulumSqueak(false)], ['squeak back', pendulumSqueak(true)], ...KINDS.flatMap((kind) => [0, 1, 4, 9].map((long): [string, VoiceSpec] => [`grow ${kind} ${long}`, growCreak(kind, long)])),
  ...['parcels-stand', 'parcels-slide', 'jelly-rolls', 'jelly-jumps', 'driver-yawns', 'keys-ripple', 'piano-rolls-back', 'necks-stretch', 'necks-duck', 'hums-a-scale', 'loses-step'].map((act): [string, VoiceSpec] => [`react ${act}`, reactVoice('post-van', 'plain', act)]),
  ...['post-van', 'caterpillar-bus'].flatMap((id) => (['like', 'dislike', 'plain'] as const).map((mood): [string, VoiceSpec] => [`react ${id} ${mood}`, reactVoice(id, mood)])),
  ...[-1, 0, 3, 7, 12].map((step): [string, VoiceSpec] => [`scale ${step}`, scaleNote(step)]),
  ['beaver slap', beaverSlap], ['beaver chatter', beaverChatter], ['beaver sigh', beaverSigh], ['mole rule', moleRule(false)], ['mole rule again', moleRule(true)], ['mole drop', moleDrop], ['pin tick', pinTick], ['pin swing', pinSwing], ['pendulum', pendulum], ['trolley set', trolleySet], ['trolley flip', trolleyFlip],
  ['rattle none', pinRattle([])], ['rattle many', pinRattle([1, 99999, 300, 400, 500, 600, 700])],
  ...[0, 1, 3, 40].flatMap((n): [string, VoiceSpec][] => [[`pop ${n}`, pinPop(n)], [`weight ${n}`, trolleyWeight(n)], [`off ${n}`, trolleyOff(n)]]),
]

describe('the voices, as numbers', () => {
  it('every sound of every voice stays inside the stated range, whatever it is asked for', () => {
    for (const [name, voice] of every) {
      expect(voice.length, name).toBeGreaterThan(0)
      expect(voice.length, name).toBeLessThanOrEqual(6)
      for (const sound of voice) {
        for (const pitch of [sound.pitch, sound.slideTo ?? sound.pitch]) { expect(pitch, name).toBeGreaterThanOrEqual(RANGE.pitch[0]); expect(pitch, name).toBeLessThanOrEqual(RANGE.pitch[1]) }
        expect(sound.peak, name).toBeGreaterThanOrEqual(RANGE.peak[0]); expect(sound.peak, name).toBeLessThanOrEqual(RANGE.peak[1])
        expect(sound.attack, name).toBeGreaterThanOrEqual(RANGE.attack[0]); expect(sound.attack, name).toBeLessThanOrEqual(RANGE.attack[1])
        expect(sound.length, name).toBeGreaterThanOrEqual(RANGE.length[0]); expect(sound.length, name).toBeLessThanOrEqual(RANGE.length[1])
        expect(sound.after ?? 0, name).toBeGreaterThanOrEqual(RANGE.after[0]); expect(sound.after ?? 0, name).toBeLessThanOrEqual(RANGE.after[1])
      }
      // Several sounds at once never add up past what one loud sound may reach twice over.
      expect(voice.reduce((sum, sound) => sum + sound.peak, 0), name).toBeLessThanOrEqual(0.5)
    }
  })

  it('a longer part sounds lower, and no two kinds land with the same voice', () => {
    for (const kind of KINDS) if (kind !== 'thread') expect(lay(kind, 4)[0].pitch).toBeLessThan(lay(kind, 1)[0].pitch)
    const first = KINDS.map((kind) => JSON.stringify(lay(kind, 2)))
    expect(new Set(first).size).toBe(KINDS.length)
    expect(new Set(KINDS.map((kind) => JSON.stringify(turn(kind, 2)))).size).toBe(KINDS.length)
    expect(new Set(KINDS.map((kind) => JSON.stringify(takeOff(kind, 2)))).size).toBe(KINDS.length)
  })

  it('a plucked thread rises with its pull and falls with its length, and a slack one only flops', () => {
    expect(pluck('thread', 8, 4, false)[0].pitch).toBeGreaterThan(pluck('thread', 2, 4, false)[0].pitch)
    expect(pluck('thread', 4, 8, false)[0].pitch).toBeLessThan(pluck('thread', 4, 4, false)[0].pitch)
    expect(pluck('thread', 4, 4, true)[0].wave).toBe('noise')
    // A stick pings when stretched and knocks when squeezed.
    expect(pluck('stick', 5, 2, false)[0].pitch).toBeGreaterThan(pluck('stick', -5, 2, false)[0].pitch)
    expect(pluck('stick', -5, 2, false)).toHaveLength(2)
  })

  it('a load is heard as the sheet says: the plank creaks lower as it bends more, the squeezed stick squeaks higher', () => {
    expect(load('plank', 0.9)[0].pitch).toBeLessThan(load('plank', 0.2)[0].pitch)
    expect(load('stick', 0.9)[0].pitch).toBeGreaterThan(load('stick', 0.2)[0].pitch)
    expect(load('thread', 0.9)[0].length).toBeGreaterThan(0.5)
    expect(load('tube', 0.5).length).toBeGreaterThan(2)
  })

  it('strain is heard before a part gives: the creak rises with the share of strength in use', () => {
    expect(creak(0.9)[0].pitch).toBeGreaterThan(creak(0.3)[0].pitch)
    expect(creak(0.9)[0].peak).toBeGreaterThan(creak(0.3)[0].peak)
  })

  it('plays through the two builders of the audio module', () => {
    const calls: string[] = []
    play(lay('plank', 2), 10, (at, pitch, wave) => calls.push(`tone ${at} ${Math.round(pitch)} ${wave}`), (at, pitch) => calls.push(`noise ${at} ${Math.round(pitch)}`))
    expect(calls).toEqual(['tone 10 233 triangle', 'noise 10 900'])
    play(trolleyBells(2), 1, (at) => calls.push(`bell ${at.toFixed(2)}`), () => {})
    expect(calls.slice(2)).toEqual(['bell 1.00', 'bell 1.08'])
  })

  it('each thing a vehicle does about its ride has a sound of its own, and a tube drums as it rolls back to the tray', () => {
    const acts = ['parcels-stand', 'parcels-slide', 'jelly-rolls', 'jelly-jumps', 'driver-yawns', 'keys-ripple', 'piano-rolls-back', 'necks-stretch', 'necks-duck', 'hums-a-scale', 'loses-step']
    expect(new Set(acts.map((act) => JSON.stringify(reactVoice('post-van', 'plain', act)))).size).toBe(acts.length)
    // The caterpillar's feet tick while it hums; out of step, the ticks are uneven and two hiccups come between them.
    const hum = reactVoice('caterpillar-bus', 'like', 'hums-a-scale'), lost = reactVoice('caterpillar-bus', 'dislike', 'loses-step')
    expect(hum.filter((sound) => sound.pitch > 1500)).toHaveLength(3)
    expect(hum.filter((sound) => sound.wave === 'sine').map((sound) => sound.pitch)).toEqual([...hum.filter((sound) => sound.wave === 'sine').map((sound) => sound.pitch)].sort((a, b) => a - b))
    const ticks = lost.filter((sound) => sound.pitch > 1500).map((sound) => sound.after ?? 0)
    expect(new Set(ticks.slice(1).map((after, i) => (after - ticks[i]).toFixed(2))).size).toBeGreaterThan(1)
    expect(lost.filter((sound) => sound.pitch < 1000)).toHaveLength(2)
    // The yawn goes up and then a long way down.
    const yawn = reactVoice('jelly-truck', 'plain', 'driver-yawns')
    expect(yawn[1].slideTo!).toBeLessThan(yawn[1].pitch / 2)
    const drum = takeOff('tube', 3)
    expect(drum.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < drum.length; i++) { expect(drum[i].after!).toBeGreaterThan(drum[i - 1].after ?? 0); expect(drum[i].pitch).toBeLessThan(drum[i - 1].pitch) }
  })
})
