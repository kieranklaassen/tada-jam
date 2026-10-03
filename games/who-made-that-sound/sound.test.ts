import { describe, expect, it } from 'vitest'
import { puffsOf, together, voiceOf } from './sound'
import { burst, crack } from './sounds'
import { INSIDE, KINDS, VOICES, callOf, callSeconds } from './voices'

/** A stand-in for an AudioContext that only writes down what was asked of it. */
function fakeContext() {
  const made: { kind: string; type: string; starts: number[]; stops: number[]; set: Record<string, [number, number][]>; ramps: Record<string, [number, number][]>; to: unknown[] }[] = []
  const node = (kind: string) => {
    const self = { kind, type: '', starts: [] as number[], stops: [] as number[], set: {} as Record<string, [number, number][]>, ramps: {} as Record<string, [number, number][]>, to: [] as unknown[] }
    const param = (name: string) => ({
      value: 0,
      setValueAtTime: (value: number, at: number) => void (self.set[name] ??= []).push([value, at]),
      exponentialRampToValueAtTime: (value: number, at: number) => void (self.ramps[name] ??= []).push([value, at]),
    })
    made.push(self)
    return Object.assign(self, {
      frequency: param('frequency'), gain: param('gain'), Q: param('Q'), buffer: null as unknown, loop: false, onended: null as unknown,
      connect: (next: unknown) => { self.to.push(next); return next },
      disconnect: () => {},
      start: (at: number) => void self.starts.push(at),
      stop: (at: number) => void self.stops.push(at),
    })
  }
  const context = {
    sampleRate: 8000, currentTime: 0,
    createOscillator: () => node('osc'), createGain: () => node('gain'), createBufferSource: () => node('source'), createBiquadFilter: () => node('band'),
    createBuffer: (_: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  return { context: context as unknown as AudioContext, out: {} as AudioNode, made }
}

describe('a voice from its numbers', () => {
  it('starts one oscillator for each note at the pitch and the time the numbers say', () => {
    for (const kind of KINDS) {
      const { context, out, made } = fakeContext()
      voiceOf(callOf(kind))(context, out, 10)
      const voice = VOICES[kind]
      // The slow oscillator of a warble is not a note.
      const notes = made.filter((node) => node.kind === 'osc' && node.set.frequency[0][0] > 100)
      expect(notes).toHaveLength(voice.notes)
      notes.forEach((osc, i) => {
        expect(osc.set.frequency[0]).toEqual([voice.pitch, 10 + i * (voice.length + voice.gap)])
        expect(osc.starts).toEqual([10 + i * (voice.length + voice.gap)])
        expect(osc.type).toBe(voice.wave)
        if (voice.glideTo !== voice.pitch) expect(osc.ramps.frequency[0][0]).toBe(voice.glideTo)
        else expect(osc.ramps.frequency).toBeUndefined()
      })
      // Nothing sounds on after the call is over.
      const last = Math.max(...made.flatMap((node) => node.stops))
      expect(last).toBeLessThanOrEqual(10 + callSeconds(voice) + 0.06)
    }
  })

  it('warbles for brrl alone, at the rate and depth of its numbers', () => {
    for (const kind of KINDS) {
      const { context, out, made } = fakeContext()
      voiceOf(callOf(kind))(context, out, 0)
      const slow = made.filter((node) => node.kind === 'osc' && node.set.frequency[0][0] < 100)
      expect(slow).toHaveLength(kind === 'brrl' ? 1 : 0)
      if (kind !== 'brrl') continue
      expect(slow[0].set.frequency[0][0]).toBe(VOICES.brrl.warbleRate)
      const depth = made.find((node) => node.kind === 'gain' && node.set.gain?.[0][0] > 1)!
      expect(depth.set.gain[0][0]).toBeCloseTo(VOICES.brrl.pitch * (2 ** (VOICES.brrl.warbleDepth / 12) - 1), 6)
    }
  })

  it('is softer from inside a hide and the same in pitch and in time', () => {
    for (const kind of KINDS) {
      const open = fakeContext(), inside = fakeContext()
      voiceOf(callOf(kind))(open.context, open.out, 0)
      voiceOf(callOf(kind, true))(inside.context, inside.out, 0)
      const peak = (made: typeof open.made) => Math.max(...made.filter((node) => node.kind === 'gain').flatMap((node) => (node.ramps.gain ?? []).map(([value]) => value)).filter((value) => value < 1))
      expect(peak(inside.made)).toBeCloseTo(peak(open.made) * INSIDE, 9)
      const pitches = (made: typeof open.made) => made.filter((node) => node.kind === 'osc').map((node) => node.set.frequency[0])
      expect(pitches(inside.made)).toEqual(pitches(open.made))
    }
  })
})

describe('everything one tap sets off', () => {
  it('is a single voice, each sound after the tap by its own delay', () => {
    const { context, out, made } = fakeContext()
    together([{ after: 0, voice: puffsOf(crack(0)) }, { after: 0.05, voice: voiceOf(callOf('pip', true)) }])(context, out, 3)
    const starts = made.flatMap((node) => node.starts.map((at) => [node.kind, at] as const))
    expect(starts.filter(([kind]) => kind === 'osc')).toEqual([['osc', 3.05]])
    expect(starts.filter(([kind]) => kind === 'source').map(([, at]) => at)).toEqual(crack(0).map((one) => 3 + one.at))
  })

  it('makes a sound that is not a voice from noise alone: nothing in it has a pitch of its own', () => {
    const { context, out, made } = fakeContext()
    puffsOf(burst(1))(context, out, 0)
    expect(made.filter((node) => node.kind === 'osc')).toHaveLength(0)
    expect(made.filter((node) => node.kind === 'source')).toHaveLength(burst(1).length)
  })
})
