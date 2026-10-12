import type { Cue } from './voices'

// One figure of the display: what is lit of it now, and the run of poses it
// is in the middle of. A pose is a list of segments. Nothing glides: a figure
// is at one pose and jumps to the next.
//
// Sight and sound run on one clock. A sound is a cue on a pose, and it is
// handed out in the call that lights that pose, never ahead and never as a
// delay inside a voice (voices.ts). Where the pose a cue belongs to is lit
// already, the pose flickers with it, so no sound is heard over a still
// picture.

/**
 * One pose of a run: what is lit, for how long, and the sound of it. `does` is what the room's short-lived state
 * becomes in the frame this pose is lit, so that a thing which moves is where it is drawn and nowhere else.
 */
export type Beat = { show: readonly string[]; hold: number; cue?: Cue; does?: () => void }

/** Seconds a segment that has just gone out lingers on the glass. Three frames: long enough to be a slow display, too short for two dogs to be seen. */
export const AFTERIMAGE = 0.05
/** How strongly it lingers at most. */
export const AFTER_STRENGTH = 0.18
/** Seconds a pose flickers when a tap asks for the pose that is already lit, so that no tap lands on a still screen. */
export const FLICKER = 0.07

export const same = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((name, i) => name === b[i])

export class Figure {
  show: readonly string[]
  /** What was lit before the last change, and how long ago that was. */
  before: readonly string[] = []
  since = 1
  flicker = 0
  /** How strongly the pose shows while it flickers. */
  dip = 0.35
  /** A scene has posed the figure, and holds it until the scene lets it go. */
  posed = false
  /** The figure is in a run a touch gave it, and not in its own idle run. */
  busy = false
  private queue: Beat[] = []
  private left: number
  private readonly tally: { poses: number } | null

  /** `tally` counts every pose taken and every flicker, for whoever asks how many there were. */
  constructor(show: readonly string[], rest: number, tally: { poses: number } | null = null) {
    this.show = show
    this.left = rest
    this.tally = tally
  }

  /**
   * A touch starts a run now: its first pose is lit in this call, and its cue handed out. Where that pose is lit
   * already and has no sound of its own, it flickers instead, so the touch is still seen.
   */
  play(beats: readonly Beat[], cues: Cue[]): void {
    const still = same(beats[0].show, this.show) && !beats[0].cue
    this.queue = beats.slice()
    this.busy = true
    this.posed = false
    this.next(cues)
    if (still) this.blink()
  }

  /** The figure's own run, started with no touch: the same, with no flicker. */
  idle(beats: readonly Beat[], cues: Cue[]): void {
    this.queue = beats.slice()
    this.busy = false
    this.posed = false
    this.next(cues)
  }

  /** Starts a run after `latency` seconds, holding the pose that is lit until then. */
  after(latency: number, beats: readonly Beat[]): void {
    this.queue = beats.slice()
    this.busy = true
    this.posed = false
    this.left = latency
  }

  /** A scene puts the figure in one pose and holds it there. */
  pose(beat: Beat, cues: Cue[]): void {
    this.queue = [beat]
    this.next(cues)
    this.left = Infinity
    this.posed = true
    this.busy = false
  }

  /** Plays `dt` seconds. Returns true when the run is over and the figure wants its idle run. */
  step(dt: number, cues: Cue[]): boolean {
    this.since += dt
    this.flicker = Math.max(0, this.flicker - dt)
    this.left -= dt
    while (this.left <= 0) {
      if (this.queue.length === 0) return true
      const over = this.left
      this.next(cues)
      this.left += over
    }
    return false
  }

  /** The lit pose flickers. A flicker that comes while one is still showing dips to another strength, so each is seen. */
  blink(): void {
    this.dip = this.flicker > 0 && this.dip === 0.35 ? 0.6 : 0.35
    this.flicker = FLICKER
    if (this.tally) this.tally.poses += 1
  }

  private next(cues: Cue[]): void {
    const beat = this.queue.shift()!
    if (!same(beat.show, this.show)) {
      this.before = this.show
      this.since = 0
      this.show = beat.show
      if (this.tally) this.tally.poses += 1
    } else if (beat.cue) {
      this.blink()
    }
    this.left = beat.hold
    if (beat.cue) cues.push(beat.cue)
    beat.does?.()
  }
}
