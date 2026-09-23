import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScarfAudio } from './audio'

type FakeBuffer = { rate: number; length: number; copyToChannel: () => void }

const param = () => ({ value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} })

function fakeContext(sampleRate: number, options: { brokenConvolver?: boolean } = {}) {
  const made: { impulses: FakeBuffer[]; contexts: number; voices: number } = { impulses: [], contexts: 0, voices: 0 }
  const node = () => ({ gain: param(), frequency: param(), Q: param(), playbackRate: param(), threshold: param(), type: '', buffer: null as unknown, connect: (next: unknown) => next, start: () => made.voices++, stop: () => {} })
  class FakeContext {
    readonly sampleRate = sampleRate
    readonly destination = node()
    readonly currentTime = 0
    state = 'suspended'
    constructor() {
      made.contexts++
    }
    createGain = node
    createDynamicsCompressor = node
    createBiquadFilter = node
    createBufferSource = node
    createOscillator = node
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

  it('plays the first touch into a context still resuming from that very touch, instead of dropping it', () => {
    const made = fakeContext(48000)
    const audio = new ScarfAudio()
    audio.unlock()
    audio.stitch(0)
    expect(made.voices).toBeGreaterThan(0)
  })
})
