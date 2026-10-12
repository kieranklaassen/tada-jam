import { describe, expect, it } from 'vitest'
import type { GameAudio, Voice } from './audio'
import { speakerOf } from './speaker'
import { notesOf } from './voices'

// A scene ended by a touch is silent from that frame, and a game put away is
// silent altogether: each voice goes through a gain of its own, and these
// tests watch the gains.

type Gain = { value: number; connected: boolean; own: boolean }

/** A stand-in for the browser's sound: every node takes every call, and the gains the speaker makes are kept. */
function standIn() {
  const gains: Gain[] = []
  const context = { currentTime: 0, sampleRate: 100 } as Record<string, unknown>
  const node = (gain: Gain | null): unknown => new Proxy({}, {
    get(_, name: string) {
      if (name === 'gain' || name === 'frequency' || name === 'Q') return { value: 0, setValueAtTime: (value: number) => { if (gain && name === 'gain') gain.value = value }, exponentialRampToValueAtTime() {} }
      if (name === 'connect') return (to: unknown) => { if (gain) gain.connected = true; return to }
      if (name === 'disconnect') return () => { if (gain) gain.connected = false }
      if (name === 'getChannelData') return () => new Float32Array(4)
      return () => undefined
    },
    set: () => true,
  })
  let first = true
  context.createGain = () => {
    // The first gain of each voice is the speaker's own; the notes make theirs after it.
    const gain: Gain = { value: 0, connected: false, own: first }
    first = false
    gains.push(gain)
    return node(gain)
  }
  for (const make of ['createOscillator', 'createBufferSource', 'createBiquadFilter', 'createBuffer']) context[make] = () => node(null)
  const audio = { play(voice: Voice) { first = true; voice(context as unknown as AudioContext, node(null) as AudioNode, context.currentTime as number) } } as unknown as GameAudio
  return { audio, context, own: () => gains.filter((gain) => gain.own) }
}

const ring = notesOf({ kind: 'ring', at: 0, n: 0.5 }), door = notesOf({ kind: 'door', at: 0, n: 0 })

describe('the speaker', () => {
  it('gives every voice a gain of its own, open while it sounds', () => {
    const { audio, own } = standIn()
    const speaker = speakerOf(audio)
    speaker.play(ring, false)
    speaker.play(door, true)
    expect(own().map((gain) => [gain.value, gain.connected])).toEqual([[1, true], [1, true]])
  })

  it('a touch that ends a scene closes what the scene was sounding, at once, and nothing else', () => {
    const { audio, own } = standIn()
    const speaker = speakerOf(audio)
    speaker.play(ring, false)
    speaker.play(door, true)
    speaker.hushScene()
    expect(own().map((gain) => [gain.value, gain.connected])).toEqual([[1, true], [0, false]])
    // What the touch itself sounds, after the hush, is heard.
    speaker.play(ring, false)
    expect(own()[2]).toEqual({ value: 1, connected: true, own: true })
  })

  it('putting the game away closes everything', () => {
    const { audio, own } = standIn()
    const speaker = speakerOf(audio)
    speaker.play(ring, false)
    speaker.play(door, true)
    speaker.hushAll()
    expect(own().every((gain) => gain.value === 0 && !gain.connected)).toBe(true)
    // Hushing twice, or with nothing sounding, is nothing.
    speaker.hushAll()
    speaker.hushScene()
  })

  it('lets go of a voice that has rung out the next time anything plays, and plays nothing for no notes', () => {
    const { audio, context, own } = standIn()
    const speaker = speakerOf(audio)
    speaker.play([], false)
    expect(own()).toHaveLength(0)
    speaker.play(ring, false)
    context.currentTime = 30
    speaker.play(ring, false)
    expect(own().map((gain) => gain.connected)).toEqual([false, true])
  })
})
