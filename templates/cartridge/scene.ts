// template: cartridge/scene.ts v1

// A short scene: a list of timed beats played over game time (pack:
// game-design, endings-and-short-scenes.md). It is the twist or the ending of
// a cycle, 4 to 10 seconds, filled in from what the child just made.
// - Time is the attended clock's, passed in. A scene stands still while the
//   game rests and carries on from the same beat.
// - Its outcome is applied and saved when it starts, so a put-away at any
//   moment of the scene loses nothing and nothing replays on load.
// - Any touch ends it at once, with every beat left at its end state.

export type Beat = {
  /** Seconds after the scene starts. */
  at: number
  /** Seconds the beat takes; 0 for a cue that just happens. */
  lasts: number
  /**
   * Called on every frame of the beat with its progress, and exactly once with
   * 1: when the beat ends, or when a touch ends the scene before or during it.
   * At 1 it must leave everything where the beat was taking it.
   */
  play(progress: number): void
}

export class Scene {
  private readonly beats: readonly Beat[]
  private readonly done: boolean[]
  private startedAt: number | null = null

  constructor(beats: readonly Beat[]) {
    this.beats = beats
    this.done = beats.map(() => false)
  }

  get running(): boolean {
    return this.startedAt !== null
  }

  /** `now` is the attended clock's seconds. `saveOutcome` runs first: it puts the scene's result into the state and saves it. */
  start(now: number, saveOutcome: () => void): void {
    saveOutcome()
    this.done.fill(false)
    this.startedAt = now
  }

  /** Call every frame with the attended clock's seconds. */
  update(now: number): void {
    if (this.startedAt === null) return
    const age = now - this.startedAt
    let left = 0
    this.beats.forEach((beat, index) => {
      if (this.done[index]) return
      if (age < beat.at) {
        left += 1
        return
      }
      const progress = beat.lasts > 0 ? Math.min(1, (age - beat.at) / beat.lasts) : 1
      if (progress >= 1) this.done[index] = true
      else left += 1
      beat.play(progress)
    })
    if (left === 0) this.startedAt = null
  }

  /** A touch: the scene ends now, and every beat that has not ended lands where it was going, in order. */
  finish(): void {
    if (this.startedAt === null) return
    this.startedAt = null
    this.beats.forEach((beat, index) => {
      if (this.done[index]) return
      this.done[index] = true
      beat.play(1)
    })
  }
}
