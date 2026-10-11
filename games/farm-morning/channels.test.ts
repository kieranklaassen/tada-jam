import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { Channels, FADE_S } from './channels'

/** A stand-in for an audio context: every node remembers what it was connected to and what its gain was told. */
function fakeContext() {
  const made = { nodes: [] as FakeNode[], now: 0 }
  const param = () => {
    const self = { value: 1, ramps: [] as { to: number; at: number }[], setValueAtTime: (value: number) => void (self.value = value), exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: (to: number, at: number) => void self.ramps.push({ to, at }) }
    return self
  }
  const node = (kind: string) => () => {
    const self = { kind, gain: param(), frequency: param(), Q: param(), type: '', buffer: null as unknown, loop: false, onended: null as unknown, to: null as unknown, disconnected: false, startedAt: -1, connect: (next: unknown) => (self.to = next), disconnect: () => void (self.disconnected = true), start: (at: number) => void (self.startedAt = at), stop: () => {} }
    made.nodes.push(self)
    return self
  }
  type FakeNode = ReturnType<ReturnType<typeof node>>
  const context = {
    get currentTime() { return made.now },
    sampleRate: 8000,
    createGain: node('gain'), createOscillator: node('osc'), createBufferSource: node('source'), createBiquadFilter: node('filter'),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  const out = node('out')()
  return { made, context: context as unknown as AudioContext, out: out as unknown as AudioNode, outNode: out }
}

const note = (delay: number): Note => ({ kind: 'tone', frequency: 440, peak: 0.1, attack: 0.01, decay: 0.1, delay })
describe('channels', () => {
  it('plays a part with no channel straight to the output', () => {
    const { made, context, out, outNode } = fakeContext()
    new Channels<'pony'>().voice([{ channel: null, replace: false, notes: [note(0)] }])(context, out, 0)
    const osc = made.nodes.find((node) => node.kind === 'osc')!
    expect((osc.to as { to: unknown }).to).toBe(outNode)
  })

  it('plays an answer through its own channel, and a new answer on the channel silences what the old one still had to sound', () => {
    const { made, context, out, outNode } = fakeContext()
    const channels = new Channels<'pony' | 'goat'>()
    // A sneeze scheduled 1.9 seconds ahead.
    channels.voice([{ channel: 'pony', replace: true, notes: [note(0), note(1.9)] }])(context, out, 0)
    const first = made.nodes.find((node) => node.kind === 'gain' && node.to === outNode)!
    const late = made.nodes.filter((node) => node.kind === 'osc')[1]
    expect(late.startedAt).toBeCloseTo(1.9)
    expect((late.to as { to: unknown }).to).toBe(first)
    expect(first.gain.ramps).toEqual([])
    // Half a second later a new use starts a new answer.
    made.now = 0.5
    channels.voice([{ channel: 'pony', replace: true, notes: [note(0)] }])(context, out, 0.5)
    expect(first.gain.ramps).toEqual([{ to: 0, at: 0.5 + FADE_S }])
    const second = made.nodes.filter((node) => node.kind === 'gain' && node.to === outNode)[1]
    expect(second).not.toBe(first)
    expect(second.gain.ramps).toEqual([])
    // Once it has faded, the old channel is let go of, well before the sneeze would have sounded.
    made.now = 0.7
    channels.voice([{ channel: 'goat', replace: true, notes: [note(0)] }])(context, out, 0.7)
    expect(first.disconnected).toBe(true)
    expect(second.disconnected).toBe(false)
  })

  it('stops a channel when it is told to, and leaves the others playing', () => {
    const { made, context, out, outNode } = fakeContext()
    const channels = new Channels<'scene' | 'pig'>()
    channels.voice([{ channel: 'scene', replace: false, notes: [note(0), note(3)] }, { channel: 'pig', replace: true, notes: [note(1)] }])(context, out, 0)
    const [scene, pig] = made.nodes.filter((node) => node.kind === 'gain' && node.to === outNode)
    made.now = 1
    channels.stop(['scene'])
    expect(scene.gain.ramps).toEqual([{ to: 0, at: 1 + FADE_S }])
    expect(pig.gain.ramps).toEqual([])
    // Stopping a channel nothing is on does nothing.
    channels.stop(['scene'])
    expect(scene.gain.ramps).toHaveLength(1)
  })

  it('lets a second sound join a channel without cutting the first', () => {
    const { made, context, out, outNode } = fakeContext()
    const channels = new Channels<'scene'>()
    channels.voice([{ channel: 'scene', replace: false, notes: [note(0)] }])(context, out, 0)
    made.now = 0.4
    channels.voice([{ channel: 'scene', replace: false, notes: [note(0)] }])(context, out, 0.4)
    const buses = made.nodes.filter((node) => node.kind === 'gain' && node.to === outNode)
    expect(buses).toHaveLength(1)
    expect(buses[0].gain.ramps).toEqual([])
  })

  it('takes its channels when the voice starts, not when it is made', () => {
    const { made, context, out, outNode } = fakeContext()
    const channels = new Channels<'pony'>()
    channels.voice([{ channel: 'pony', replace: true, notes: [note(0)] }])(context, out, 0)
    const first = made.nodes.find((node) => node.kind === 'gain' && node.to === outNode)!
    // A voice that is made and held (waiting for the unlock) has stopped nothing yet.
    const held = channels.voice([{ channel: 'pony', replace: true, notes: [note(0)] }])
    expect(first.gain.ramps).toEqual([])
    held(context, out, 0.2)
    expect(first.gain.ramps).toHaveLength(1)
  })

  it('starts again on a context that was rebuilt', () => {
    const a = fakeContext(), b = fakeContext()
    const channels = new Channels<'scene'>()
    channels.voice([{ channel: 'scene', replace: false, notes: [note(0)] }])(a.context, a.out, 0)
    channels.voice([{ channel: 'scene', replace: false, notes: [note(0)] }])(b.context, b.out, 0)
    expect(b.made.nodes.filter((node) => node.kind === 'gain' && node.to === b.outNode)).toHaveLength(1)
  })
})
