import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { HushBus } from './hush'

// A scene ended by a touch is silent from that frame, and put-away closes all
// sound: both go through the bus, which this holds with a stubbed context.

type FakeNode = { gain: { value: number; setValueAtTime(value: number): void; exponentialRampToValueAtTime(value: number): void; linearRampToValueAtTime(value: number): void }; frequency: FakeNode['gain']; Q: FakeNode['gain']; type: string; buffer: unknown; to: unknown; disconnected: boolean; started: boolean; connect(next: unknown): unknown; disconnect(): void; start(): void; stop(): void }

function fakeContext() {
  const nodes: FakeNode[] = []
  const param = () => {
    const self = { value: 1, setValueAtTime: (value: number) => void (self.value = value), exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }
    return self
  }
  const node = (): FakeNode => {
    const self: FakeNode = {
      gain: param(), frequency: param(), Q: param(), type: '', buffer: null, to: null, disconnected: false, started: false,
      connect: (next) => (self.to = next),
      disconnect: () => void (self.disconnected = true),
      start: () => void (self.started = true),
      stop: () => {},
    }
    nodes.push(self)
    return self
  }
  const context = {
    currentTime: 0, sampleRate: 8000, destination: node(),
    createGain: node, createOscillator: node, createBufferSource: node, createBiquadFilter: node,
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  return { context: context as unknown as AudioContext, out: context.destination as unknown as AudioNode, nodes }
}

const NOTES: Note[] = [{ kind: 'tone', frequency: 440, peak: 0.2, attack: 0.01, decay: 0.2 }]
/** The nodes that were connected straight to the way out: the gains the bus made. */
const gains = (nodes: FakeNode[], out: unknown): FakeNode[] => nodes.filter((node) => node.to === out)

describe('the hush', () => {
  it('sends every voice out through one gain of its own', () => {
    const bus = new HushBus(), { context, out, nodes } = fakeContext()
    bus.voice(NOTES)(context, out, 0)
    bus.voice(NOTES)(context, out, 0)
    expect(gains(nodes, out).length).toBe(1)
    expect(nodes.filter((node) => node.started).length).toBe(2)
  })

  it('cuts everything that is sounding on the frame it is called', () => {
    const bus = new HushBus(), { context, out, nodes } = fakeContext()
    bus.voice(NOTES)(context, out, 0)
    const [gain] = gains(nodes, out)
    bus.hush()
    expect(gain.gain.value).toBe(0)
    expect(gain.disconnected).toBe(true)
  })

  it('never lets a voice be heard that was still waiting when the hush came', () => {
    const bus = new HushBus(), { context, out, nodes } = fakeContext()
    const waiting = bus.voice(NOTES)
    bus.hush()
    waiting(context, out, 0)
    expect(nodes.filter((node) => node.started).length).toBe(0)
  })

  it('gives the next voice a new gain, so the game sounds again after a hush', () => {
    const bus = new HushBus(), { context, out, nodes } = fakeContext()
    bus.voice(NOTES)(context, out, 0)
    bus.hush()
    bus.voice(NOTES)(context, out, 0)
    const made = gains(nodes, out)
    expect(made.length).toBe(2)
    expect(made[1].disconnected).toBe(false)
    expect(made[1].gain.value).toBe(1)
  })

  it('takes a hush with nothing sounding, and a hush after the context has gone', () => {
    const bus = new HushBus(), { context, out, nodes } = fakeContext()
    expect(() => bus.hush()).not.toThrow()
    bus.voice(NOTES)(context, out, 0)
    gains(nodes, out)[0].disconnect = () => {
      throw new Error('closed')
    }
    expect(() => bus.hush()).not.toThrow()
  })
})
