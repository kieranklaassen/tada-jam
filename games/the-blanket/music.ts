import type { AudioTrack, Engine } from '@kieranklaassen/live-mix'
import { Mood } from './mood'
import { RENDER_RATE, STEMS, TAIL_SEC, type Stem } from './score'
import { SCORE } from './tune'
import type { Played } from './music.worker'

// The music, on live-mix. A worker plays the score once on live-mix's instruments (music.worker.ts); the sections are
// then clips on three tracks of a live-mix engine, one a stem, and the mood moves the tracks' levels. The engine
// plays in the game's own audio context, so it starts inside the child's first touch, rests with the game and is
// rebuilt with it. Its music bus goes down under the game's own sounds and comes back after them.

/** The level of the whole of the music. The game's sounds are what the child plays with; this stands behind them. */
export const MUSIC_LEVEL = 1
/** Seconds, about a third of the way: a stem comes in over a few seconds and leaves more slowly. */
const COME = 1.1, GO = 2.6

/** The engine's timers, driven by the game's own frames: they stop when the game rests, as everything in it does. */
class Beats {
  private now = 0
  private next = 1
  private readonly timers = new Map<number, { run: () => void; every: number; due: number }>()

  readonly clock = {
    setIntervalFn: (run: () => void, ms: number): number => {
      const id = this.next
      this.next += 1
      this.timers.set(id, { run, every: ms / 1000, due: this.now + ms / 1000 })
      return id
    },
    clearIntervalFn: (id: unknown): void => { this.timers.delete(id as number) },
  }

  step(seconds: number): void {
    this.now += seconds
    for (const timer of [...this.timers.values()]) {
      if (this.now < timer.due) continue
      timer.due = this.now + timer.every
      timer.run()
    }
  }
}

export class Music {
  private readonly mood = new Mood()
  private worker: Worker | null = null
  private sounds: { id: string; buffer: AudioBuffer }[] = []
  private whole = false
  private context: AudioContext | null = null
  private key: AudioNode | null = null
  private engine: Engine | null = null
  private tracks: Partial<Record<Stem, AudioTrack>> = {}
  private set: Partial<Record<Stem, number>> = {}
  private disposed = false
  private readonly beats = new Beats()

  /** The game's audio made a context, or lost the one it had. */
  readonly attach = (context: AudioContext | null, key: AudioNode | null): void => {
    this.release()
    this.context = context
    this.key = key
    if (!context || this.disposed) return
    if (this.whole) void this.build()
    else this.rehearse()
  }

  touch(): void {
    this.mood.touch()
  }

  step(seconds: number): void {
    this.mood.step(seconds)
    this.beats.step(seconds)
    if (!this.engine) return
    const levels = this.mood.levels()
    for (const stem of STEMS) {
      const was = this.set[stem], now = levels[stem]
      if (was === now) continue
      this.tracks[stem]?.strip.setLevel(now, { timeConstant: was === undefined || now > was ? COME : GO })
      this.set[stem] = now
    }
  }

  dispose(): void {
    this.disposed = true
    this.worker?.terminate()
    this.worker = null
    this.release()
    this.sounds = []
  }

  private rehearse(): void {
    if (this.worker || typeof Worker === 'undefined') return
    const worker = new Worker(new URL('./music.worker.ts', import.meta.url), { type: 'module' })
    this.worker = worker
    worker.onmessage = (event: MessageEvent<Played | 'done'>) => {
      if (event.data !== 'done') {
        const { stem, section, channels } = event.data
        // A buffer belongs to no context, so it outlives one that is lost.
        const buffer = new AudioBuffer({ numberOfChannels: 2, length: channels[0].length, sampleRate: RENDER_RATE })
        channels.forEach((channel, c) => buffer.copyToChannel(channel, c))
        this.sounds.push({ id: `${stem}-${section}`, buffer })
        return
      }
      this.whole = true
      worker.terminate()
      void this.build()
    }
    worker.onerror = () => worker.terminate()
  }

  private async build(): Promise<void> {
    const context = this.context, key = this.key
    if (!context || !key) return
    try {
      const { createEngine } = await import('@kieranklaassen/live-mix')
      // Put away, or the context was lost, while the engine was on its way.
      if (this.disposed || this.context !== context || this.engine) return
      const engine = createEngine({ ...this.beats.clock, context, loop: { enabled: true, lengthSec: SCORE.form.length * SCORE.sectionSec } })
      this.engine = engine
      // The ducker holds its bus at 1 or below, so the level has a bus of its own after it.
      const level = engine.addBus('level', { gain: MUSIC_LEVEL })
      const bus = engine.addBus('music', { destination: level })
      for (const stem of STEMS) {
        const track = engine.addAudioTrack(stem, { destination: bus, lookaheadSec: 2 })
        track.strip.setLevel(0)
        this.tracks[stem] = track
      }
      await Promise.all(this.sounds.map(({ id, buffer }) => engine.samples.load(id, buffer)))
      if (this.engine !== engine) return
      for (const stem of STEMS) {
        SCORE.form.forEach((section, i) => {
          if (!section) return
          this.tracks[stem]!.clips.add({
            id: `${stem}-${i}`, sourceId: `${stem}-${section}`, startSec: i * SCORE.sectionSec, offsetSec: 0,
            durationSec: SCORE.sectionSec + TAIL_SEC, fadeInSec: 0, fadeOutSec: 0, fadeCurve: 'linear', gainDb: 0,
          })
        })
      }
      engine.addDucker(bus, { depth: 0.55, attackMs: 40, releaseMs: 700, gainScale: 14 }).key(key)
      engine.transport.start()
    } catch {
      // No music is better than no game.
      this.release()
    }
  }

  private release(): void {
    const engine = this.engine
    this.engine = null
    this.tracks = {}
    this.set = {}
    try { engine?.dispose() } catch { /* its context is gone already */ }
  }
}
