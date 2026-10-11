import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Note } from './audio'
import { BUSES, Buses, HUSH_SECONDS } from './bus'

// A stub of the few parts of Web Audio a voice touches: every node remembers
// what it was connected to and what was asked of its gain.

type FakeNode = {
  kind: string
  to: unknown
  context: unknown
  started: number | null
  faded: { at: number; over: number } | null
  cancelled: number | null
  disconnected: boolean
  [other: string]: unknown
}

function fakeContext(currentTime = 3) {
  const nodes: FakeNode[] = []
  const node = (kind: string): FakeNode => {
    const self: FakeNode = {
      kind, to: null, context: null, started: null, faded: null, cancelled: null, disconnected: false,
      type: '', buffer: null, loop: false, onended: null,
      frequency: { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      Q: { value: 0 },
      gain: {
        value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {},
        cancelScheduledValues: (at: number) => void (self.cancelled = at),
        setTargetAtTime: (_to: number, at: number, over: number) => void (self.faded = { at, over }),
      },
      connect: (next: unknown) => (self.to = next),
      disconnect: () => void (self.disconnected = true),
      start: (at: number) => void (self.started = at),
      stop: () => {},
    }
    nodes.push(self)
    return self
  }
  const context = {
    currentTime, sampleRate: 8000, destination: node('out'),
    createGain: (): FakeNode => { const made = node('gain'); made.context = context; return made },
    createOscillator: () => node('osc'),
    createBufferSource: () => node('source'),
    createBiquadFilter: () => node('filter'),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  return { context: context as unknown as AudioContext, out: context.destination as unknown as AudioNode, nodes }
}

const note = (frequency: number): Note => ({ kind: 'tone', frequency, peak: 0.1, attack: 0.01, decay: 0.1 })
const none = {}
/** The node a chain of connections ends at before the way out. */
const last = (node: FakeNode, out: unknown): FakeNode => { let here = node; while (here.to && here.to !== out) here = here.to as FakeNode; return here }

describe('the buses', () => {
  afterEach(() => { vi.useRealTimers() })

  it('takes a hushed bus off the way out once it is silent, and leaves the others on it', () => {
    vi.useFakeTimers()
    const { context, out, nodes } = fakeContext()
    const buses = new Buses()
    buses.voice([], { stage: [note(400)], 'on:owl': [note(500)] })(context, out, 3)
    const [stage, owl] = nodes.filter((node) => node.kind === 'osc').map((source) => last(source, out))
    expect(stage).not.toBe(owl)
    buses.hush('on:owl')
    expect(owl.disconnected).toBe(false)
    vi.advanceTimersByTime(1100)
    expect(owl.disconnected).toBe(true)
    expect(stage.disconnected).toBe(false)
  })

  it('sends the answer to a touch straight out, and what a scene or a carry sounds through a bus of its own', () => {
    const { context, out, nodes } = fakeContext()
    const buses = new Buses()
    buses.voice([note(300)], { stage: [note(400)], carry: [note(500), note(600)] })(context, out, 3)
    const sources = nodes.filter((node) => node.kind === 'osc')
    expect(sources).toHaveLength(4)
    expect(sources.every((source) => source.started === 3)).toBe(true)
    const ways = sources.map((source) => last(source, out))
    // The plain note ends at its own envelope; the others at one bus each, and the two of the carry share theirs.
    expect(new Set(ways).size).toBe(3)
    expect(ways[2]).toBe(ways[3])
    expect(ways[1]).not.toBe(ways[2])
    // A bus is a node of its own that leads straight out.
    for (const way of ways.slice(1)) expect(way).toMatchObject({ kind: 'gain', to: out })
    expect(sources.slice(1).every((source) => source.to !== ways[1] && source.to !== ways[2])).toBe(true)
  })

  it('hushes one bus: what rings on it fades at once, the other bus and the plain way out are left alone, and what sounds next goes through a new bus', () => {
    const { context, out, nodes } = fakeContext(7)
    const buses = new Buses()
    buses.voice([note(300)], { stage: [note(400)], carry: [note(500)] })(context, out, 7)
    const [plain, stage, carry] = nodes.filter((node) => node.kind === 'osc').map((source) => last(source, out))
    buses.hush('carry')
    expect(carry.cancelled).toBe(7)
    expect(carry.faded).toEqual({ at: 7, over: HUSH_SECONDS })
    expect(stage.faded).toBeNull()
    expect(plain.faded).toBeNull()
    // Silent well inside a tenth of a second.
    expect(HUSH_SECONDS * 5).toBeLessThan(0.1)
    buses.voice([], { stage: [note(410)], carry: [note(510)] })(context, out, 7.5)
    const [stageAgain, carryAgain] = nodes.filter((node) => node.kind === 'osc').slice(3).map((source) => last(source, out))
    expect(stageAgain).toBe(stage)
    expect(carryAgain).not.toBe(carry)
    expect(carryAgain.faded).toBeNull()
  })

  it('does nothing when nothing has sounded on a bus, and builds a new bus on a new context', () => {
    const buses = new Buses()
    for (const bus of BUSES) expect(() => buses.hush(bus)).not.toThrow()
    const first = fakeContext(), second = fakeContext()
    buses.voice([], { ...none, stage: [note(400)] })(first.context, first.out, 0)
    buses.voice([], { ...none, stage: [note(400)] })(second.context, second.out, 0)
    const way = last(second.nodes.find((node) => node.kind === 'osc')!, second.out)
    expect(way.kind).toBe('gain')
    expect(way.context).toBe(second.context)
    expect(first.nodes).not.toContain(way)
  })

  it('makes no node for a moment with nothing to sound', () => {
    const { context, out, nodes } = fakeContext()
    new Buses().voice([], none)(context, out, 0)
    expect(nodes).toHaveLength(1)
  })
})
