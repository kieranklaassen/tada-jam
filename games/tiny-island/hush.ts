import type { Voice } from './audio'
import { voiceOf } from './audio'
import { notesOf, type Sound } from './voices'

// The wave's sounds go through a gain of their own. A touch that ends the
// wash, or calls the rearing wave off, drops that gain to nothing: the long
// roll and the rising yawn stop where they are, and a sound of the wash that
// was waiting for the browser to let audio start never sounds. Everything
// else the game says goes round that gain, so the touch that ended the wash
// is heard.
//
// And every sound of the game, the wave's too, goes through one more gain of
// the same kind, which a put-away cuts at once (`cut`): a note that was set
// to sound later, a cry, a horn, a patter of drops, has nothing to sound
// through when the game comes back, and the returned island is as silent as
// a loaded one. That gain stays shut until the next touch opens it
// (`shutNow`, `open`).

/** How long the gain takes to fall to nothing, in seconds: short enough to be the same frame, long enough not to click. */
export const HUSH_S = 0.03

export class Hush {
  private bus: { context: AudioContext; out: AudioNode; gain: GainNode } | null = null
  /** Cut at a put-away and not opened since: a voice made now never sounds. */
  private shut = false
  /** Gains that were dropped: let go of at the next hush, by when nothing sounds through them. */
  private readonly spent: GainNode[] = []
  private round = 0

  /** The same voice, sounded through the gain. One made before the last hush stays silent whenever it is played. */
  voice(inner: Voice): Voice {
    const round = this.round, shut = this.shut
    return (context, out, at) => {
      if (shut || round !== this.round) return
      // The first sound makes the gain, and a rebuilt context or another way out gets a new one.
      if (!this.bus || this.bus.context !== context || this.bus.out !== out) {
        const gain = context.createGain()
        gain.connect(out)
        this.bus = { context, out, gain }
      }
      inner(context, this.bus.gain, at)
    }
  }

  /** Silent from now: what sounds through the gain is cut, and the next wash gets a gain of its own. */
  now(): void {
    this.round += 1
    for (const gain of this.spent) gain.disconnect()
    this.spent.length = 0
    const bus = this.bus
    this.bus = null
    if (!bus) return
    // This runs inside a touch handler: a context that has gone away must never stop the touch.
    try {
      const at = bus.context.currentTime, level = bus.gain.gain
      level.cancelScheduledValues(at)
      level.setValueAtTime(level.value, at)
      level.linearRampToValueAtTime(0, at + HUSH_S)
      this.spent.push(bus.gain)
    } catch {
      bus.gain.disconnect()
    }
  }

  /**
   * The game is put away: silent at once, with no fall. Whatever was set to sound through the gain, now or later,
   * is taken off its way out, since the audio's own clock stops with the game and a fall would be heard on the
   * return.
   */
  cut(): void {
    this.round += 1
    for (const gain of this.spent) gain.disconnect()
    this.spent.length = 0
    this.bus?.gain.disconnect()
    this.bus = null
  }

  /** Cut, and nothing sounds through this gain again until `open`. */
  shutNow(): void {
    this.cut()
    this.shut = true
  }

  /** A touch: what is said from now on is heard. */
  open(): void {
    this.shut = false
  }

  dispose(): void {
    this.now()
    for (const gain of this.spent) gain.disconnect()
    this.spent.length = 0
  }
}

/**
 * Plays what the island queued and empties the list. A hush comes first, so a wash that was ended in this touch
 * is cut before the touch's own answer sounds. The wave's sounds are one voice through the hushed gain and the
 * rest another, played last, and both go through `all`, the gain a put-away cuts: of two that wait for the browser to let audio start it is the one that is kept.
 */
export function playQueued(audio: { play(voice: Voice): void }, hush: Hush, island: { sounds: Sound[]; hushed: boolean }, all: Hush): void {
  if (island.hushed) {
    hush.now()
    island.hushed = false
  }
  if (island.sounds.length === 0) return
  const wash = island.sounds.filter((sound) => sound.wash), rest = island.sounds.filter((sound) => !sound.wash)
  island.sounds.length = 0
  // Every sound goes out through the gain a put-away cuts; the wave's through its own first.
  if (wash.length > 0) audio.play(all.voice(hush.voice(voiceOf(notesOf(wash)))))
  if (rest.length > 0) audio.play(all.voice(voiceOf(notesOf(rest))))
}
