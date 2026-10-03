// template: cartridge/audio.test.ts v2
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameAudio, noise, tick, tone, type Voice } from './audio'

type Answer = 'refuse' | 'wait' | 'run'

/**
 * A stubbed AudioContext. Each context answers `resume()` from its own script,
 * in order: 'refuse' rejects and stays suspended, 'wait' leaves the promise
 * open until the context starts, 'run' starts it. Past the end of the script
 * it runs. As in a browser, `suspend()` leaves the state at 'running' until
 * its promise settles. `attempts` counts every context the game tried to
 * build, including the ones that threw. `nodes` holds every node any context
 * made, in order, each with what it was connected to and whether it has been
 * disconnected; a parameter keeps the last value it was set to.
 */
function fakeAudio(scripts: Answer[][] = [], options: { broken?: boolean } = {}) {
  const made = { contexts: [] as { state: string }[], attempts: 0, closed: 0, voices: 0, nodes: [] as FakeNode[], noises: [] as Float32Array[] }
  const param = () => {
    const self = { value: 1, rampedTo: null as number | null, setValueAtTime: (value: number) => void (self.value = value), exponentialRampToValueAtTime: (value: number) => void (self.rampedTo = value) }
    return self
  }
  const node = () => {
    const self = {
      gain: param(), frequency: param(), threshold: param(), Q: param(), type: '', buffer: null as unknown, loop: false, onended: null as unknown,
      to: null as unknown, disconnected: false,
      connect: (next: unknown) => (self.to = next),
      disconnect: () => void (self.disconnected = true),
      start: () => made.voices++,
      stop: () => {},
    }
    made.nodes.push(self)
    return self
  }
  type FakeNode = ReturnType<typeof node>
  class FakeContext {
    readonly destination = node()
    readonly currentTime = 0
    readonly sampleRate = 8000
    state = 'suspended'
    private readonly script: Answer[]
    private readonly waiting: (() => void)[] = []
    constructor() {
      made.attempts += 1
      if (options.broken) throw new Error('no audio here')
      this.script = scripts[made.contexts.length] ?? []
      made.contexts.push(this)
    }
    createGain = node
    createDynamicsCompressor = node
    createOscillator = node
    createBufferSource = node
    createBiquadFilter = node
    createBuffer(_channels: number, length: number) {
      const data = new Float32Array(length)
      made.noises.push(data)
      return { getChannelData: () => data }
    }
    resume() {
      const answer = this.script.shift()
      if (answer === 'refuse') return Promise.reject(new Error('not allowed yet'))
      if (answer === 'wait') return new Promise<void>((resolve) => this.waiting.push(resolve))
      this.state = 'running'
      for (const resolve of this.waiting.splice(0)) resolve()
      return Promise.resolve()
    }
    suspend() {
      return Promise.resolve().then(() => {
        if (this.state === 'running') this.state = 'suspended'
      })
    }
    close() {
      made.closed += 1
      this.state = 'closed'
      return Promise.resolve()
    }
  }
  vi.stubGlobal('window', { AudioContext: FakeContext })
  return made
}

/** Lets the stubbed context's promises settle. */
const answered = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve()
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the unlock', () => {
  it('that fails on touch-down succeeds on the lift, and the touch is heard once', async () => {
    fakeAudio([['refuse', 'run']])
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    await answered()
    expect(played).toBe(0)
    audio.touchUp()
    await answered()
    expect(played).toBe(1)
    audio.touchDown()
    audio.touchUp()
    await answered()
    expect(played).toBe(1)
  })

  it('keeps the first finger\'s sound when a second finger or a palm lands inside the touch', async () => {
    fakeAudio([['refuse', 'refuse', 'run']])
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    audio.touchDown()
    await answered()
    expect(played).toBe(0)
    audio.touchUp()
    await answered()
    expect(played).toBe(1)
  })

  it('ends its touch when the game rests, so a sound made after the wake and outside a touch is not held', async () => {
    fakeAudio([['refuse', 'refuse', 'run']])
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    await answered()
    audio.setActive(false)
    audio.setActive(true)
    await answered()
    audio.play(() => played++)
    // The old touch's lift arrives late, or never: either way it has nothing to release.
    audio.touchUp()
    await answered()
    expect(played).toBe(0)
  })

  it('that is left unanswered on touch-down and lands on the lift plays the touch once, not twice', async () => {
    fakeAudio([['wait', 'run']])
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    await answered()
    expect(played).toBe(0)
    audio.touchUp()
    await answered()
    expect(played).toBe(1)
  })

  it('plays the lift\'s own sound when the game plays it just before the lift is reported', async () => {
    fakeAudio([['refuse', 'run']])
    const audio = new GameAudio()
    const heard: string[] = []
    audio.touchDown()
    audio.play(() => heard.push('press'))
    audio.play(() => heard.push('tap'))
    audio.touchUp()
    await answered()
    expect(heard).toEqual(['tap'])
  })

  it('that lands on touch-down plays that touch at once, and later sounds as they come', async () => {
    fakeAudio()
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    await answered()
    expect(played).toBe(1)
    audio.touchUp()
    await answered()
    audio.play(() => played++)
    expect(played).toBe(2)
  })

  it('that is refused on the lift too drops the sound, so it is never heard late', async () => {
    fakeAudio([['refuse', 'refuse', 'run']])
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    audio.touchUp()
    await answered()
    audio.touchDown()
    await answered()
    expect(played).toBe(0)
  })

  it('never holds a sound made outside a touch before the first one', async () => {
    fakeAudio()
    const audio = new GameAudio()
    let played = 0
    audio.play(() => played++)
    audio.touchDown()
    await answered()
    expect(played).toBe(0)
  })
})

describe('the context', () => {
  it('is rebuilt on the next touch when WebKit left it interrupted', async () => {
    const made = fakeAudio()
    const audio = new GameAudio()
    audio.touchDown()
    audio.touchUp()
    await answered()
    made.contexts[0].state = 'interrupted'
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    await answered()
    expect(made.contexts).toHaveLength(2)
    expect(made.closed).toBe(1)
    expect(played).toBe(1)
  })

  it('that cannot be built never stops the touch, and is not retried on every tap', () => {
    const made = fakeAudio([], { broken: true })
    const audio = new GameAudio()
    expect(() => audio.touchDown()).not.toThrow()
    expect(() => audio.play(tick)).not.toThrow()
    expect(() => audio.touchUp()).not.toThrow()
    audio.touchDown()
    audio.touchUp()
    expect(made.attempts).toBe(1)
    expect(made.contexts).toHaveLength(0)
  })

  it('is silent from the moment the game rests, and sounds again when it wakes', async () => {
    const made = fakeAudio()
    const audio = new GameAudio()
    audio.touchDown()
    audio.touchUp()
    await answered()
    audio.setActive(false)
    // The browser has not suspended the context yet; a sound the game plays as it goes to rest is still not heard.
    expect(made.contexts[0].state).toBe('running')
    audio.play(tick)
    expect(made.voices).toBe(0)
    await answered()
    expect(made.contexts[0].state).toBe('suspended')
    audio.play(tick)
    expect(made.voices).toBe(0)
    audio.setActive(true)
    await answered()
    audio.play(tick)
    expect(made.voices).toBe(1)
  })

  it('forgets a sound held from a refused touch-down when the game rests, so a lift after the rest plays nothing', async () => {
    fakeAudio([['refuse', 'refuse', 'run']])
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    await answered()
    audio.setActive(false)
    audio.setActive(true)
    await answered()
    audio.touchUp()
    await answered()
    expect(played).toBe(0)
    // The context did start on that lift: a sound played now is heard.
    audio.play(() => played++)
    expect(played).toBe(1)
  })

  it('is closed on dispose', async () => {
    const made = fakeAudio()
    const audio = new GameAudio()
    audio.touchDown()
    await answered()
    audio.dispose()
    expect(made.closed).toBe(1)
  })
})

describe('the building blocks', () => {
  const blocks: [string, Voice][] = [
    ['a tone', (context, out, at) => tone(context, out, at, 440, 'sine', 0.2, 0.01, 0.3)],
    ['a noise', (context, out, at) => noise(context, out, at, 1800, 4, 0.2, 0.01, 0.3)],
  ]

  /** A context that is running, as after a first touch. */
  async function running() {
    const made = fakeAudio()
    const audio = new GameAudio()
    audio.touchDown()
    audio.touchUp()
    await answered()
    return { made, audio }
  }

  it.each(blocks)('%s starts once, and lets go of every node it made when it ends', async (_, voice) => {
    const { made, audio } = await running()
    const before = made.nodes.length
    audio.play(voice)
    const own = made.nodes.slice(before)
    expect(own.length).toBeGreaterThan(1)
    expect(made.voices).toBe(1)
    expect(own.some((node) => node.disconnected)).toBe(false)
    const sources = own.filter((node) => typeof node.onended === 'function')
    expect(sources).toHaveLength(1)
    ;(sources[0].onended as () => void)()
    expect(own.every((node) => node.disconnected)).toBe(true)
    // What it played into is the game's, and stays.
    expect(made.nodes.slice(0, before).some((node) => node.disconnected)).toBe(false)
  })

  it('a noise is a looped band of noise through an envelope, into what it was given', async () => {
    const { made, audio } = await running()
    const before = made.nodes.length
    let master: unknown = null
    audio.play((context, out, at) => {
      master = out
      noise(context, out, at, 1800, 4, 0.2, 0.01, 0.3, 900)
    })
    const [source, band, gain] = made.nodes.slice(before)
    expect(source.buffer).not.toBeNull()
    expect(source.loop).toBe(true)
    expect(source.to).toBe(band)
    expect(band.type).toBe('bandpass')
    expect(band.Q.value).toBe(4)
    expect(band.frequency.value).toBe(1800)
    expect(band.frequency.rampedTo).toBe(900)
    expect(band.to).toBe(gain)
    // Up to its peak and back down to silence.
    expect(gain.gain.rampedTo).toBeLessThan(0.001)
    expect(gain.to).toBe(master)
  })

  it('makes its noise once for a context, however many sounds use it, and the noise fills the range', async () => {
    const { made, audio } = await running()
    for (let i = 0; i < 3; i++) audio.play(blocks[1][1])
    expect(made.voices).toBe(3)
    expect(made.noises).toHaveLength(1)
    const [data] = made.noises
    expect(data.length).toBe(8000 * 1.5)
    expect(Math.min(...data)).toBeLessThan(-0.9)
    expect(Math.min(...data)).toBeGreaterThanOrEqual(-1)
    expect(Math.max(...data)).toBeGreaterThan(0.9)
    expect(Math.max(...data)).toBeLessThanOrEqual(1)
  })
})
