import { describe, expect, it } from 'vitest'
import { SoundBus } from './bus'
import { notesOf } from './voices'

// A scene that a touch ends, and a game that is put to rest, are silent from
// that moment. The bus is what makes that so: these tests play real voices
// into a stand-in for the browser's audio and look at the gains.

type Gain = { gain: { value: number }; connected: object[]; closed: boolean }

/** Anything a voice asks of the audio context: every call does nothing and gives back more of the same. */
function anything(): unknown {
  const fn = (): unknown => anything()
  return new Proxy(fn, {
    get: (_target, name) => (name === 'getChannelData' ? () => new Float32Array(64) : anything()),
    set: () => true,
  })
}

function context(): { context: AudioContext; out: AudioNode; gains: Gain[] } {
  const gains: Gain[] = []
  const param = (): { value: number } => new Proxy({ value: 1 }, { get: (target, name) => (name === 'value' ? target.value : () => {}) }) as { value: number }
  const made = {
    currentTime: 0,
    sampleRate: 8000,
    createGain: () => {
      const one: Gain & { connect: (to: object) => void; disconnect: () => void } = {
        gain: param(), connected: [], closed: false,
        connect(to) { this.connected.push(to) },
        disconnect() { this.closed = true; this.connected = [] },
      }
      gains.push(one)
      return one
    },
  }
  const fake = new Proxy(made, { get: (target, name) => (name in target ? Reflect.get(target, name) : () => anything()) })
  return { context: fake as unknown as AudioContext, out: { name: 'out' } as unknown as AudioNode, gains }
}

/** The gains that feed the output directly: one for each voice the bus has let through. */
const voices = (audio: ReturnType<typeof context>): Gain[] => audio.gains.filter((gain) => gain.connected.includes(audio.out) || gain.closed)

describe('the sound bus', () => {
  const long = notesOf({ type: 'whistle', index: 0 })

  it('puts each voice through a gain of its own, between the voice and the output', () => {
    const audio = context()
    const bus = new SoundBus()
    bus.voice(long)(audio.context, audio.out, 0)
    const through = audio.gains.filter((gain) => gain.connected.includes(audio.out))
    expect(through).toHaveLength(1)
    expect(through[0].gain.value).toBe(1)
    // Nothing of the voice reaches the output except through that gain.
    expect(audio.gains.length).toBeGreaterThan(1)
  })

  it('a cut closes every voice that is still sounding, at once', () => {
    const audio = context()
    const bus = new SoundBus()
    bus.voice(long)(audio.context, audio.out, 0)
    bus.voice(notesOf({ type: 'gong', index: 0 }))(audio.context, audio.out, 0.1)
    const sounding = audio.gains.filter((gain) => gain.connected.includes(audio.out))
    expect(sounding).toHaveLength(2)
    bus.cut()
    for (const gain of sounding) {
      expect(gain.gain.value).toBe(0)
      expect(gain.closed).toBe(true)
      expect(gain.connected).toEqual([])
    }
  })

  it('a voice that was made before a cut and is asked to start after it never starts', () => {
    const audio = context()
    const bus = new SoundBus()
    // The browser had not allowed sound yet, so the voice was kept waiting; then the scene was ended.
    const waiting = bus.voice(long)
    bus.cut()
    waiting(audio.context, audio.out, 0)
    expect(audio.gains).toEqual([])
    // A voice made after the cut sounds.
    bus.voice(notesOf({ type: 'clack' }))(audio.context, audio.out, 0)
    expect(voices(audio)).toHaveLength(1)
    expect(voices(audio)[0].gain.value).toBe(1)
  })

  it('lets go of the voices that have rung out', () => {
    const audio = context()
    const bus = new SoundBus()
    bus.voice(notesOf({ type: 'clack' }))(audio.context, audio.out, 0)
    const first = audio.gains.find((gain) => gain.connected.includes(audio.out))!
    bus.voice(notesOf({ type: 'clack' }))(audio.context, audio.out, 30)
    expect(first.closed).toBe(true)
  })
})
