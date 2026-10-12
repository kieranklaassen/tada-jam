import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameAudio, type Note } from './audio'
import { BEACHES } from './beaches'
import { deserializeKingdom } from './kingdom'
import { Play } from './play'
import { JOURNEY_SECONDS } from './sun'
import { TIDE_OUT } from './timeline'
import { VOICES, type VoiceName } from './voices'

// One clock for sight and sound. A sound that comes later than the touch that
// caused it waits on the game's clock, never inside a voice; a scene's sounds
// pass through a gain of their own; and a touch that ends the scene, or the
// game going to rest, closes that gain and drops what the scene had still to
// sound.

const DT = 1 / 60

/** Which named voice a list of notes is, by its notes being the very ones in the table. */
function nameOf(voice: readonly Note[]): VoiceName | null {
  for (const name of Object.keys(VOICES) as VoiceName[]) if (VOICES[name].length > 0 && voice.length % VOICES[name].length === 0 && voice[0] === VOICES[name][0]) return name
  return null
}
/** Plays for a while as the Mount does, taking the voices of every frame, and returns them with when they came. */
function listen(play: Play, seconds: number): { at: number; name: VoiceName | null; scene: boolean; notes: readonly Note[] }[] {
  const out: { at: number; name: VoiceName | null; scene: boolean; notes: readonly Note[] }[] = []
  const take = (): void => {
    for (const voice of play.voices) out.push({ at: play.time, name: nameOf(voice), scene: false, notes: voice })
    for (const voice of play.sceneVoices) out.push({ at: play.time, name: nameOf(voice), scene: true, notes: voice })
    play.voices.length = 0
    play.sceneVoices.length = 0
  }
  take()
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    play.step(DT)
    take()
  }
  return out
}
function tapSun(play: Play): void {
  play.press({ kind: 'sun' })
  play.tap()
}

describe('a sound that comes later', () => {
  it('waits on the game clock and sounds in the frame its moment comes: the pop of a tower a fifth of a second after its whump', () => {
    const play = new Play(deserializeKingdom(null, 3), 1)
    play.press({ kind: 'bucket' })
    play.tap()
    const first = listen(play, 0)
    expect(first.flatMap((one) => one.notes).includes(VOICES.whump[0])).toBe(true)
    expect(first.flatMap((one) => one.notes).includes(VOICES.pop[0])).toBe(false)
    const said = play.heard.find((one) => one.name === 'pop')!
    const later = listen(play, 0.5).filter((one) => one.name === 'pop')
    expect(later).toHaveLength(1)
    // In the frame the clock reaches it, and not a frame later.
    expect(later[0].at).toBeGreaterThanOrEqual(said.at - 1e-9)
    expect(later[0].at).toBeLessThan(said.at + DT + 1e-9)
  })

  it('is never a delay added inside a voice: every note the game sounds is as the table of voices has it', () => {
    const table = new Set<Note>(Object.values(VOICES).flat())
    const play = new Play(BEACHES.kingdom(7), 3)
    const heard: { notes: readonly Note[] }[] = []
    const act = (): void => void heard.push(...listen(play, 0.4))
    for (const target of [{ kind: 'bucket' }, { kind: 'bucket' }, { kind: 'shell', index: 0 }, { kind: 'wood', index: 0 }, { kind: 'sand', x: 1.5, z: 4 }, { kind: 'sand', x: -0.1, z: 3.45 }, { kind: 'folk', who: 'crab', index: 0 }, { kind: 'cloud', index: 0 }] as const) {
      play.press(target)
      play.tap()
      act()
    }
    tapSun(play)
    heard.push(...listen(play, JOURNEY_SECONDS + 10))
    tapSun(play)
    heard.push(...listen(play, JOURNEY_SECONDS + 7))
    let named = 0
    for (const voice of heard) {
      for (const note of voice.notes) {
        // A thud, a hiss and a tick are made for the moment and start at once.
        if (!table.has(note)) expect(note.delay ?? 0).toBe(0)
        else named += 1
      }
    }
    expect(named).toBeGreaterThan(20)
  })
})

describe('a scene ended by a touch', () => {
  it('the long wave: its rising hush is a voice of the scene, and the touch that ends the wave closes it', () => {
    const play = new Play(BEACHES.evening(7), 3)
    tapSun(play)
    const before = listen(play, JOURNEY_SECONDS + TIDE_OUT.wave.at + 1.0)
    const wave = before.find((one) => one.name === 'wave')!
    expect(wave.scene).toBe(true)
    expect(play.playing).toBe(true)
    expect(play.hush).toBe(false)
    // A finger lands: the Mount ends the scene first, and the press is then an ordinary touch.
    play.endScene()
    expect(play.hush).toBe(true)
    expect(play.playing).toBe(false)
    expect(play.sceneVoices).toHaveLength(0)
    play.press({ kind: 'sand', x: 1, z: 4 })
    play.tap()
    // Nothing of the scene sounds afterwards, and every sound from here on is a touch's.
    const after = listen(play, 6)
    expect(after.some((one) => one.scene)).toBe(false)
    expect(after.some((one) => one.name === 'wave' || one.name === 'hush' || one.name === 'fizz')).toBe(false)
  })

  it('the folk coming: the fizz of the rising sea is closed, and the hush that was still to come is never heard nor noted', () => {
    const state = BEACHES.kingdom(7)
    const play = new Play(state, 3)
    tapSun(play)
    const before = listen(play, JOURNEY_SECONDS + 0.5)
    expect(before.find((one) => one.name === 'fizz')?.scene).toBe(true)
    expect(play.playing).toBe(true)
    play.endScene()
    expect(play.hush).toBe(true)
    const now = play.time
    expect(play.heard.some((one) => one.at > now + 1e-9)).toBe(false)
    const after = listen(play, 8)
    expect(after.some((one) => one.name === 'hush' || one.name === 'plops' || one.name === 'fizz' || one.name === 'climb')).toBe(false)
  })

  it('a scene that plays to its end closes nothing', () => {
    const play = new Play(BEACHES.evening(7), 3)
    tapSun(play)
    listen(play, JOURNEY_SECONDS + 8)
    expect(play.playing).toBe(false)
    expect(play.hush).toBe(false)
  })
})

/** A stubbed audio context that runs at once and keeps every gain it makes, with what was set on it. */
function fakeAudio() {
  const gains: { value: number; rampedTo: number | null; rampedBy: number | null; to: unknown; disconnected: boolean }[] = []
  const node = () => {
    const self = {
      gain: { value: 1, setValueAtTime: (value: number) => void (kept.value = value), exponentialRampToValueAtTime: (value: number, at: number) => { kept.rampedTo = value; kept.rampedBy = at } },
      threshold: { value: 0 },
      connect: (next: unknown) => (kept.to = next),
      disconnect: () => void (kept.disconnected = true),
    }
    const kept = { value: 1, rampedTo: null as number | null, rampedBy: null as number | null, to: null as unknown, disconnected: false }
    gains.push(kept)
    return self
  }
  class FakeContext {
    readonly destination = {}
    currentTime = 0
    state = 'suspended'
    createGain = node
    createDynamicsCompressor = node
    resume() {
      this.state = 'running'
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
  return gains
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the gain a scene sounds through', () => {
  const started = async (): Promise<{ audio: GameAudio; gains: ReturnType<typeof fakeAudio> }> => {
    const gains = fakeAudio()
    const audio = new GameAudio()
    audio.touchDown()
    audio.touchUp()
    for (let i = 0; i < 4; i++) await Promise.resolve()
    return { audio, gains }
  }

  it('is closed in under a hundredth of a second by the touch that ends the scene, and the next scene sounds through a new one', async () => {
    const { audio, gains } = await started()
    const outs: unknown[] = []
    audio.playScene((_, out) => void outs.push(out))
    expect(outs).toHaveLength(1)
    const scene = gains[gains.length - 1]
    audio.hush()
    expect(scene.rampedTo).toBeLessThanOrEqual(0.0001)
    expect(scene.rampedBy).toBeLessThan(0.01)
    audio.playScene((_, out) => void outs.push(out))
    expect(outs[1]).not.toBe(outs[0])
    expect(gains[gains.length - 1].rampedTo).toBeNull()
  })

  it('is shut at once when the game goes to rest, and a scene makes no sound while it rests', async () => {
    const { audio, gains } = await started()
    let played = 0
    audio.playScene(() => played++)
    const scene = gains[gains.length - 1]
    audio.setActive(false)
    expect(scene.value).toBe(0)
    audio.playScene(() => played++)
    expect(played).toBe(1)
  })

  it('leaves a touch\'s own sound alone', async () => {
    const { audio } = await started()
    const outs: unknown[] = []
    audio.play((_, out) => void outs.push(out))
    audio.playScene((_, out) => void outs.push(out))
    audio.hush()
    audio.play((_, out) => void outs.push(out))
    expect(outs[2]).toBe(outs[0])
    expect(outs[1]).not.toBe(outs[0])
  })
})
