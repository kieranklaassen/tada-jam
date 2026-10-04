import { describe, expect, it } from 'vitest'
import { voiceOf } from './sound'
import { ALL_VOICES, type Notes } from './voices'

type FakeParam = {
  value: number
  setAt: number | null
  ramps: [value: number, at: number][]
  setValueAtTime: (value: number, at: number) => void
  exponentialRampToValueAtTime: (value: number, at: number) => void
}

type FakeNode = {
  made: 'gain' | 'oscillator' | 'noise' | 'band' | 'out'
  gain: FakeParam
  frequency: FakeParam
  Q: FakeParam
  type: string
  buffer: unknown
  loop: boolean
  onended: unknown
  to: FakeNode | null
  startedAt: number | null
  stoppedAt: number | null
  connect: (next: FakeNode) => FakeNode
  disconnect: () => void
  start: (at: number) => void
  stop: (at: number) => void
}

/**
 * A stand-in for an AudioContext, in the manner of audio.test.ts: every node
 * it makes is kept in order, with how it was made, what it was connected to,
 * when it was started and stopped, and what each parameter was set and ramped
 * to. No window and no running game are needed: a Voice is handed its context.
 */
function fakeContext() {
  const nodes: FakeNode[] = []
  const param = (): FakeParam => {
    const self: FakeParam = {
      value: 1, setAt: null, ramps: [],
      setValueAtTime: (value, at) => { self.value = value; self.setAt = at },
      exponentialRampToValueAtTime: (value, at) => void self.ramps.push([value, at]),
    }
    return self
  }
  const node = (made: FakeNode['made']) => (): FakeNode => {
    const self: FakeNode = {
      made, gain: param(), frequency: param(), Q: param(), type: '', buffer: null, loop: false, onended: null,
      to: null, startedAt: null, stoppedAt: null,
      connect: (next) => (self.to = next),
      disconnect: () => {},
      start: (at) => void (self.startedAt = at),
      stop: (at) => void (self.stoppedAt = at),
    }
    nodes.push(self)
    return self
  }
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    createGain: node('gain'),
    createOscillator: node('oscillator'),
    createBufferSource: node('noise'),
    createBiquadFilter: node('band'),
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length)
      return { getChannelData: () => data }
    },
  }
  const out = node('out')()
  /** The nodes that make sound, in the order they were made. */
  const sources = (): FakeNode[] => nodes.filter((each) => each.made === 'oscillator' || each.made === 'noise')
  /** The envelope a source ends in. */
  const envelope = (source: FakeNode): FakeNode => {
    let at = source.to!
    while (at.made !== 'gain') at = at.to!
    return at
  }
  return { context: context as unknown as AudioContext, out: out as unknown as AudioNode, outNode: out, nodes, sources, envelope }
}

const THREE: Notes = [
  { at: 0, kind: 'tone', pitch: 440, to: 660, peak: 0.12, attack: 0.01, length: 0.1, wave: 'triangle' },
  { at: 0.05, kind: 'noise', pitch: 1800, to: 900, peak: 0.06, attack: 0.02, length: 0.2, q: 4 },
  { at: 0.25, kind: 'tone', pitch: 220, peak: 0.08, attack: 0.004, length: 0.05 },
]

describe('voiceOf', () => {
  it('makes one source for each note, started at its own moment after the voice starts', () => {
    const fake = fakeContext()
    voiceOf(THREE)(fake.context, fake.out, 10)
    const sources = fake.sources()
    expect(sources.map((source) => source.made)).toEqual(['oscillator', 'noise', 'oscillator'])
    expect(sources[0].startedAt).toBeCloseTo(10, 6)
    expect(sources[1].startedAt).toBeCloseTo(10.05, 6)
    expect(sources[2].startedAt).toBeCloseTo(10.25, 6)
    // Each stops after its own attack and length, and not before.
    expect(sources[0].stoppedAt).toBeGreaterThanOrEqual(10 + 0.01 + 0.1)
    expect(sources[1].stoppedAt).toBeGreaterThanOrEqual(10.05 + 0.02 + 0.2)
    expect(sources[2].stoppedAt).toBeGreaterThanOrEqual(10.25 + 0.004 + 0.05)
    expect(sources[2].stoppedAt).toBeLessThan(10.25 + 0.004 + 0.05 + 0.1)
  })

  it('hands a tone its pitch, wave, glide and loudness', () => {
    const fake = fakeContext()
    voiceOf(THREE)(fake.context, fake.out, 2)
    const [first, , third] = fake.sources()
    expect(first.type).toBe('triangle')
    expect(first.frequency.value).toBe(440)
    expect(first.frequency.setAt).toBeCloseTo(2, 6)
    expect(first.frequency.ramps).toEqual([[660, expect.closeTo(2 + 0.01 + 0.1, 6)]])
    // Up to the peak by the end of the attack, then down to silence.
    const gain = fake.envelope(first).gain
    expect(gain.ramps[0]).toEqual([0.12, expect.closeTo(2.01, 6)])
    expect(gain.ramps[1][0]).toBeLessThan(0.001)
    expect(gain.ramps[1][1]).toBeCloseTo(2.11, 6)
    expect(fake.envelope(first).to).toBe(fake.outNode)
    // A tone with no wave is a sine, and one with no glide stays where it is.
    expect(third.type).toBe('sine')
    expect(third.frequency.value).toBe(220)
    expect(third.frequency.ramps).toEqual([])
    expect(fake.envelope(third).gain.ramps[0][0]).toBe(0.08)
  })

  it('hands a noise its band, how narrow it is, its glide and loudness', () => {
    const fake = fakeContext()
    voiceOf(THREE)(fake.context, fake.out, 2)
    const source = fake.sources()[1]
    const band = source.to!
    expect(band.made).toBe('band')
    expect(band.type).toBe('bandpass')
    expect(band.Q.value).toBe(4)
    expect(band.frequency.value).toBe(1800)
    expect(band.frequency.ramps).toEqual([[900, expect.closeTo(2.05 + 0.02 + 0.2, 6)]])
    expect(fake.envelope(source).gain.ramps[0]).toEqual([0.06, expect.closeTo(2.07, 6)])
    expect(fake.envelope(source).to).toBe(fake.outNode)
  })

  it('gives a noise with no band of its own a middling one', () => {
    const fake = fakeContext()
    voiceOf([{ at: 0, kind: 'noise', pitch: 500, peak: 0.05, attack: 0.01, length: 0.05 }])(fake.context, fake.out, 0)
    const band = fake.nodes.find((each) => each.made === 'band')!
    expect(band.Q.value).toBe(1.2)
    expect(band.frequency.ramps).toEqual([])
  })

  it('makes nothing for no notes, and builds nothing until it is played', () => {
    const fake = fakeContext()
    const voice = voiceOf(THREE)
    expect(fake.sources()).toHaveLength(0)
    voiceOf([])(fake.context, fake.out, 0)
    expect(fake.sources()).toHaveLength(0)
    voice(fake.context, fake.out, 0)
    voice(fake.context, fake.out, 1)
    expect(fake.sources()).toHaveLength(6)
  })

  it('plays every voice of the room: a source for each note, none started before the voice, each at full loudness or under', () => {
    for (const { notes } of ALL_VOICES()) {
      const fake = fakeContext()
      voiceOf(notes)(fake.context, fake.out, 3)
      const sources = fake.sources()
      expect(sources).toHaveLength(notes.length)
      sources.forEach((source, i) => {
        expect(source.made).toBe(notes[i].kind === 'tone' ? 'oscillator' : 'noise')
        expect(source.startedAt).toBeCloseTo(3 + notes[i].at, 6)
        expect(fake.envelope(source).gain.ramps[0][0]).toBe(notes[i].peak)
      })
    }
  })
})
