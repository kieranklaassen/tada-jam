import type { Note } from './audio'
import type { Cause, Cue } from './play'
import { notesFor, type Sound } from './voices'

// Notes that start a while after the cue they belong to: the cherry's plip,
// the gate keeper's whistle, a balloon's hum taken up again. They wait here on
// the game's clock, and each is handed out in the frame its time has come. So
// a resting game holds them with everything else, a touch that ends a scene
// drops those that have not begun, and a note that belongs to something (a
// stack on the breath, a thing on its way down, the hat being in the hole) is
// dropped in the frame that thing is over: no note starts after its cause.

export class Later {
  private readonly waiting: { at: number; note: Note; cause: Cause | null }[] = []

  /** `notes` were set off at `now`, in the game clock's seconds. Returns those that start at once; the others wait for their time. */
  take(notes: readonly Sound[], now: number): Note[] {
    const first: Note[] = []
    for (const note of notes) {
      const delay = note.delay ?? 0
      if (delay <= 0) first.push(note)
      else this.waiting.push({ at: now + delay, note: { ...note, delay: 0 }, cause: note.cause ?? null })
    }
    return first
  }

  /** The notes whose time has come by `now`, earliest first. Each is handed out once. */
  due(now: number): Note[] {
    const due = this.waiting.filter((one) => one.at <= now).sort((a, b) => a.at - b.at)
    if (due.length > 0) this.waiting.splice(0, this.waiting.length, ...this.waiting.filter((one) => one.at > now))
    return due.map((one) => one.note)
  }

  /** What these notes belonged to is over: those of them that still wait are not heard. */
  end(cause: Cause): void {
    this.waiting.splice(0, this.waiting.length, ...this.waiting.filter((one) => one.cause !== cause))
  }

  /** A touch has ended a scene, or the game is put away: nothing that waits is heard. */
  drop(): void {
    this.waiting.length = 0
  }

  /** How many notes wait. */
  get waits(): number {
    return this.waiting.length
  }

  /** How many of them wait on `cause`. */
  waitingOn(cause: Cause): number {
    return this.waiting.filter((one) => one.cause === cause).length
  }
}

/**
 * What is heard in this frame: of the cues the toy and the scene queued, the notes that start at once, and every
 * waiting note whose time has come. A cue that says something is over drops the notes that waited on it first,
 * before this frame's own notes are taken. While the sound is not running yet (`running` false: the first touch of
 * a visit, whose sound waits whole for the unlock), the frame's notes are handed on whole with their delays.
 */
export function heard(cues: readonly Cue[], takes: Map<string, number>, later: Later, now: number, running: boolean): Note[] {
  for (const cue of cues) if (cue.type === 'over') later.end(cue.cause)
  const notes: Note[] = notesFor(cues, takes)
  return [...(running ? later.take(notes, now) : notes), ...later.due(now)]
}
