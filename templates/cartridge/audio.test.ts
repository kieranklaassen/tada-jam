// template: cartridge/audio.test.ts v1
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameAudio, tick } from './audio'

type Answer = 'refuse' | 'wait' | 'run'

/**
 * A stubbed AudioContext. Each context answers `resume()` from its own script,
 * in order: 'refuse' rejects and stays suspended, 'wait' leaves the promise
 * open until the context starts, 'run' starts it. Past the end of the script
 * it runs.
 */
function fakeAudio(scripts: Answer[][] = [], options: { broken?: boolean } = {}) {
  const made = { contexts: [] as { state: string }[], closed: 0, voices: 0 }
  const param = () => ({ value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} })
  const node = () => ({ gain: param(), frequency: param(), threshold: param(), type: '', onended: null as unknown, connect: (next: unknown) => next, disconnect: () => {}, start: () => made.voices++, stop: () => {} })
  class FakeContext {
    readonly destination = node()
    readonly currentTime = 0
    state = 'suspended'
    private readonly script: Answer[]
    private readonly waiting: (() => void)[] = []
    constructor() {
      if (options.broken) throw new Error('no audio here')
      this.script = scripts[made.contexts.length] ?? []
      made.contexts.push(this)
    }
    createGain = node
    createDynamicsCompressor = node
    createOscillator = node
    resume() {
      const answer = this.script.shift()
      if (answer === 'refuse') return Promise.reject(new Error('not allowed yet'))
      if (answer === 'wait') return new Promise<void>((resolve) => this.waiting.push(resolve))
      this.state = 'running'
      for (const resolve of this.waiting.splice(0)) resolve()
      return Promise.resolve()
    }
    suspend() {
      this.state = 'suspended'
      return Promise.resolve()
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
    expect(made.contexts).toHaveLength(0)
  })

  it('is silent while the game rests and sounds again when it wakes', async () => {
    const made = fakeAudio()
    const audio = new GameAudio()
    audio.touchDown()
    audio.touchUp()
    await answered()
    audio.setActive(false)
    expect(made.contexts[0].state).toBe('suspended')
    audio.play(tick)
    expect(made.voices).toBe(0)
    audio.setActive(true)
    await answered()
    audio.play(tick)
    expect(made.voices).toBe(1)
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
