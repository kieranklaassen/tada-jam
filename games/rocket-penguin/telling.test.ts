import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { SceneGain } from './sceneGain'
import { tellSounds } from './telling'
import { BARE_PAPER, play, playUntil, staged } from './testing'
import { ICE_Y, PENGUIN } from './world'

// A scene that a touch ends is silent from that frame: not only are its
// later beats and cues dropped (sync.test.ts), the voices of it that are
// already sounding are cut off. The toy says a touch ended a scene, and the
// Mount's `tell` closes the scene's gain before it plays the touch's answer.

/**
 * A stand-in for the audio's context that makes silent nodes. `gains` holds the gains that were connected
 * straight to `out`, which are the scene's own, each remembering whether it was taken off the output.
 */
function fakeContext() {
  const out = {} as AudioNode
  const gains: { off: boolean }[] = []
  const param = () => ({ value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {}, setTargetAtTime: () => {} })
  const node = () => {
    const self = {
      gain: param(), frequency: param(), Q: param(), type: '', buffer: null as unknown, loop: false, onended: null as unknown, off: false,
      connect: (next: unknown) => { if (next === out) gains.push(self); return next },
      disconnect: () => { self.off = true },
      start: () => {}, stop: () => {},
    }
    return self
  }
  const context = {
    currentTime: 0, sampleRate: 8000,
    createGain: node, createOscillator: node, createBufferSource: node, createBiquadFilter: node,
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  return { context: context as unknown as AudioContext, out, gains }
}

describe('what is told to the audio', () => {
  it('cuts off what a scene was sounding in the frame a touch ends it, and plays the touch through a new gain', () => {
    const { context, out, gains } = fakeContext()
    const scene = new SceneGain()
    const voices: Voice[] = []
    const tell = (toy: Parameters<typeof tellSounds>[0]): void => {
      voices.length = 0
      tellSounds(toy, scene, (voice) => voices.push(voice))
      // The audio plays a voice in the call that hands it over.
      for (const voice of voices) voice(context, out, 0)
    }
    // A bare penguin comes down by the beak beside the catapult: its scene slides it home, with a long scrape.
    const played = staged([], { x: 238, y: ICE_Y - PENGUIN.r - 6, vy: 500 })
    tell(played.toy)
    playUntil(played, (toy) => toy.phase === 'scene')
    // Play on until the slide is sounding.
    let slid = false
    for (let n = 0; n < 600 && !slid; n++) {
      played.toy.step(1 / 60)
      const sounds = played.toy.takeSounds()
      slid = sounds.some((sound) => sound.name === 'slide')
      tellSounds({ takeHush: () => played.toy.takeHush(), takeSounds: () => sounds }, scene, (voice) => voice(context, out, 0))
    }
    expect(slid).toBe(true)
    expect(played.toy.phase).toBe('scene')
    expect(gains).toHaveLength(1)
    expect(gains[0].off).toBe(false)
    // A touch on bare paper ends the scene. In the very next telling the scene's gain is off the output, and the dot of the touch sounds through a new one.
    played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    tell(played.toy)
    expect(gains[0].off).toBe(true)
    expect(voices).toHaveLength(1)
    expect(gains).toHaveLength(2)
    expect(gains[1].off).toBe(false)
    // It is said once: the frames after it cut nothing.
    played.toy.tap()
    play(played, 0.5)
    tell(played.toy)
    expect(gains[1].off).toBe(false)
    expect(gains).toHaveLength(2)
  })

  it('cuts nothing at a touch that ends no scene', () => {
    const { context, out, gains } = fakeContext()
    const scene = new SceneGain()
    const played = staged([], { x: 600, y: 300, vx: 100, vy: -100 })
    played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    tellSounds(played.toy, scene, (voice) => voice(context, out, 0))
    played.toy.tap()
    played.toy.press(BARE_PAPER.x + 40, BARE_PAPER.y)
    tellSounds(played.toy, scene, (voice) => voice(context, out, 0))
    expect(gains).toHaveLength(1)
    expect(gains[0].off).toBe(false)
  })
})
