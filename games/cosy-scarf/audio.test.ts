import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScarfAudio } from './audio'

type FakeBuffer = { rate: number; length: number; copyToChannel: () => void }

const node = () => ({ gain: { value: 1 }, frequency: { value: 1 }, threshold: { value: 0 }, type: '', connect: (next: unknown) => next })

function fakeContext(sampleRate: number, options: { brokenConvolver?: boolean } = {}) {
  const made: { impulses: FakeBuffer[]; contexts: number } = { impulses: [], contexts: 0 }
  class FakeContext {
    readonly sampleRate = sampleRate
    readonly destination = node()
    state = 'suspended'
    constructor() {
      made.contexts++
    }
    createGain = node
    createDynamicsCompressor = node
    createBiquadFilter = node
    createBuffer(_channels: number, length: number, rate: number): FakeBuffer {
      return { rate, length, copyToChannel: () => {} }
    }
    createConvolver() {
      if (options.brokenConvolver) throw new Error('no convolver here')
      const context = this
      return {
        connect: (next: unknown) => next,
        set buffer(buffer: FakeBuffer) {
          if (buffer.rate !== context.sampleRate) throw new Error(`buffer rate ${buffer.rate} is not ${context.sampleRate}`)
          made.impulses.push(buffer)
        },
      }
    }
    resume() {
      return Promise.resolve()
    }
    suspend() {
      return Promise.resolve()
    }
    close() {
      return Promise.resolve()
    }
  }
  vi.stubGlobal('window', { AudioContext: FakeContext })
  return made
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sound', () => {
  it('builds the woolly room at whatever rate the device runs, so the first tap works at 44.1 kHz too', () => {
    const made = fakeContext(44100)
    const audio = new ScarfAudio()
    expect(() => audio.unlock()).not.toThrow()
    expect(made.impulses).toHaveLength(1)
    expect(made.impulses[0].rate).toBe(44100)
    expect(made.impulses[0].length).toBe(Math.round(44100 * 0.9))
  })

  it('never lets a sound that cannot start stop the touch, and does not retry it on every tap', () => {
    const made = fakeContext(48000, { brokenConvolver: true })
    const audio = new ScarfAudio()
    expect(() => audio.unlock()).not.toThrow()
    expect(() => audio.unlock()).not.toThrow()
    expect(() => audio.stitch(0)).not.toThrow()
    expect(made.contexts).toBe(1)
  })
})
