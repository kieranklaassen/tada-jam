import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { Gate } from './sound'

// Lesson 2 at the speaker: the gate every voice plays through can close all
// of them in one frame.

function fakeContext() {
  const gains: { value: number; connected: boolean; cancelled: boolean }[] = []
  const context = {
    currentTime: 0,
    createGain() {
      const gain = { value: 1, connected: false, cancelled: false }
      gains.push(gain)
      return {
        gain: { cancelScheduledValues: () => { gain.cancelled = true }, setValueAtTime: (value: number) => { gain.value = value } },
        connect: () => { gain.connected = true },
        disconnect: () => { gain.connected = false },
      }
    },
  }
  return { context: context as unknown as AudioContext, gains, at: (seconds: number) => { context.currentTime = seconds } }
}

describe('the gate', () => {
  it('gives every voice a gain of its own between it and the output', () => {
    const gate = new Gate(), { context, gains } = fakeContext()
    const heard: AudioNode[] = []
    const voice: Voice = (_context, out) => { heard.push(out) }
    const out = {} as AudioNode
    gate.through(voice)(context, out, 0)
    gate.through(voice)(context, out, 0.1)
    expect(gains).toHaveLength(2)
    expect(gains.every((gain) => gain.connected)).toBe(true)
    expect(heard.every((node) => node !== out)).toBe(true)
    expect(gate.open).toBe(2)
  })

  it('cuts every voice that may still be ringing, at once', () => {
    const gate = new Gate(), { context, gains, at } = fakeContext()
    const voice: Voice = () => {}
    gate.through(voice)(context, {} as AudioNode, 0)
    at(0.2)
    gate.through(voice)(context, {} as AudioNode, 0.2)
    gate.cut()
    expect(gains.map((gain) => gain.value)).toEqual([0, 0])
    expect(gains.every((gain) => gain.cancelled && !gain.connected)).toBe(true)
    expect(gate.open).toBe(0)
    // Cut again with nothing ringing, it does nothing.
    gate.cut()
  })

  it('forgets a voice that is over for certain, so that it holds no node for ever', () => {
    const gate = new Gate(), { context, at } = fakeContext()
    const voice: Voice = () => {}
    for (let i = 0; i < 50; i++) {
      at(i * 2)
      gate.through(voice)(context, {} as AudioNode, i * 2)
    }
    expect(gate.open).toBe(1)
  })
})
