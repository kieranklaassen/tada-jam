import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { Outlet, voiceFor } from './outlets'

// A scene ended by a touch is silent from that frame, and a put-away closes all sound. Both are an outlet being
// shut. A stand-in for the audio graph records what was connected to what.

type FakeNode = { gain: Param; frequency: Param; type: string; onended: unknown; to: unknown; disconnected: boolean; connect: (next: unknown) => unknown; disconnect: () => void; start: () => void; stop: () => void }
type Param = { value: number; setValueAtTime: (value: number) => void; exponentialRampToValueAtTime: () => void }

/** Every node the context made. An outlet's gain is one that is connected to the master. */
function fakeContext() {
  const nodes: FakeNode[] = []
  const param = (): Param => { const self: Param = { value: 1, setValueAtTime: (value) => void (self.value = value), exponentialRampToValueAtTime: () => {} }; return self }
  const node = () => {
    const self: FakeNode = { gain: param(), frequency: param(), type: '', onended: null, to: null, disconnected: false, connect: (next) => (self.to = next), disconnect: () => void (self.disconnected = true), start: () => {}, stop: () => {} }
    nodes.push(self)
    return self
  }
  const outlets = () => nodes.filter((made) => made.to === master)
  return { context: { createGain: node, createOscillator: node } as unknown as AudioContext, gains: nodes, outlets }
}

const master = { name: 'master' } as unknown as AudioNode
/** A voice that records the node it was sent to. */
const recorder = (into: unknown[]): Voice => (_context, out) => void into.push(out)

describe('an outlet', () => {
  it('sends a voice through its own gain, and the same gain for every voice until it is shut', () => {
    const { context, gains } = fakeContext()
    const outlet = new Outlet(), went: unknown[] = []
    outlet.through(recorder(went))(context, master, 0)
    outlet.through(recorder(went))(context, master, 0)
    expect(gains).toHaveLength(1)
    expect(gains[0].to).toBe(master)
    expect(went).toEqual([gains[0], gains[0]])
  })

  it('shut, silences what is sounding through it at once, and gives the next voice a fresh gain', () => {
    const { context, gains } = fakeContext()
    const outlet = new Outlet(), went: unknown[] = []
    outlet.through(recorder(went))(context, master, 0)
    outlet.shut()
    expect(gains[0].gain.value).toBe(0)
    expect(gains[0].disconnected).toBe(true)
    outlet.through(recorder(went))(context, master, 0)
    expect(gains).toHaveLength(2)
    expect(gains[1].disconnected).toBe(false)
    expect(went[1]).toBe(gains[1])
    // Shut with nothing sounding, it does nothing.
    const idle = new Outlet()
    idle.shut()
  })

  it('makes a gain again on a new audio context', () => {
    const first = fakeContext(), second = fakeContext()
    const outlet = new Outlet()
    outlet.through(() => {})(first.context, master, 0)
    outlet.through(() => {})(second.context, master, 0)
    expect(second.gains).toHaveLength(1)
  })
})

describe('the voice of one touch or one step', () => {
  it('sends a scene\'s sounds through the scenes\' outlet and the rest through the other, so shutting the one leaves the other sounding', () => {
    const { context, outlets } = fakeContext()
    const play = new Outlet(), scene = new Outlet()
    voiceFor([{ name: 'pat' }, { name: 'thump', scene: true }, { name: 'baton', n: 1, scene: true }], play, scene)(context, master, 0)
    expect(outlets()).toHaveLength(2)
    const [first, second] = outlets()
    scene.shut()
    expect([first.disconnected, second.disconnected]).toEqual([false, true])
    expect(second.gain.value).toBe(0)
    play.shut()
    expect([first.disconnected, second.disconnected]).toEqual([true, true])
  })

  it('opens no outlet a sound does not go through', () => {
    const { context, outlets } = fakeContext()
    voiceFor([{ name: 'pat' }], new Outlet(), new Outlet())(context, master, 0)
    expect(outlets()).toHaveLength(1)
    voiceFor([], new Outlet(), new Outlet())(context, master, 0)
    expect(outlets()).toHaveLength(1)
  })
})
