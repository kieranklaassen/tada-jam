// template: cartridge/scene.ts v3

// A short scene: a list of timed beats played over game time (pack:
// game-design, endings-and-short-scenes.md). It is the twist or the ending of
// a cycle, 4 to 10 seconds, filled in from what the child just made.
// - Time is the attended clock's, passed in. A scene stands still while the
//   game rests and carries on from the same beat.
// - Its outcome is applied and saved when it starts, at once and not at the
//   save throttle, so a put-away at any moment of the scene loses nothing and
//   nothing replays on load.
// - Any touch ends it at once, with every beat left at its end state.
// - What is saved and what is seen are two things. The save holds the scene's
//   end from its first moment; the screen arrives there beat by beat. A scene
//   that changes what the game draws from keeps what is shown apart from what
//   is saved until the beat that shows it.
// Four rules for the game that plays one:
// - The game calls `finish()` first thing in every press, before the press is
//   answered. The touch ends the scene and is then an ordinary touch, and a
//   scene that the press itself starts is started after that call.
// - A beat that lays things down as it goes (a trail, a row of sparks) counts
//   what it has laid and lays the rest when its progress arrives. Finishing
//   jumps its progress to 1, and whatever it had not laid yet is laid then.
// - A beat that makes a sound asks `finishing` and stays quiet when it is
//   true. A touch lands every beat that is left in one call, and the sounds
//   of the rest of the scene would otherwise all play at once. The same goes
//   for anything else that belongs to the scene being watched and not to its
//   end state.
// - A scene that a held finger or a rub starts lets go of that finger first,
//   or the same finger's next move is read as the touch that ends it.
// One scene plays at a time. A second one that should follow the first is
// made into one scene with it (`followedBy`).

export type Beat = {
  /** Seconds after the scene starts. */
  at: number
  /** Seconds the beat takes; 0 for a cue that just happens. */
  lasts: number
  /**
   * Called on every frame of the beat with its progress, and exactly once with
   * 1: when the beat ends, or when a touch ends the scene before or during it.
   * At 1 it must leave everything where the beat was taking it. `finishing`
   * is true when a touch is ending the scene and this call lands the beat
   * unwatched: no sound then, only the end state.
   */
  play(progress: number, finishing: boolean): void
}

/** Seconds from a scene's start to the end of its last beat. */
export function sceneLength(beats: readonly Beat[]): number {
  return beats.reduce((end, beat) => Math.max(end, beat.at + beat.lasts), 0)
}

/**
 * One scene's beats and then another's: the beats of `next` come after those of `first`, each with its time
 * moved to after the last beat of `first` has ended. The two play as one scene, so both outcomes are applied
 * and saved when it starts, and a touch ends both.
 */
export function followedBy(first: readonly Beat[], next: readonly Beat[]): Beat[] {
  const from = sceneLength(first)
  return [...first, ...next.map((beat) => ({ ...beat, at: beat.at + from }))]
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

  /**
   * `now` is the attended clock's seconds. `saveOutcome` runs first: it puts the scene's result into the state and
   * saves it at once (`cadence.change(time, true)` in the Mount). A scene that only shows something and changes
   * nothing, or whose outcome the game has already saved, passes a function that does nothing.
   */
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
      beat.play(progress, false)
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
      beat.play(1, true)
    })
  }
}
