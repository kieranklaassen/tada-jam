// When to hand the meadow to ctx.storage. The storage layer debounces and
// the shell flushes on put-away; this makes sure the newest meadow (a seed
// mid-drag included) is what the last save() carried, without calling save
// on every frame of a drag.

export const DRAG_SAVE_MS = 500

export class SaveCadence {
  private dirty = false
  private last = -Infinity
  private readonly save: () => void

  constructor(save: () => void) {
    this.save = save
  }

  /** A meaningful change (planted, picked, dropped): save now. */
  now(at: number): void {
    this.dirty = true
    this.commit(at)
  }

  /** Something is moving (a seed under a finger): save at most every DRAG_SAVE_MS. */
  moving(at: number): void {
    this.dirty = true
    if (at - this.last >= DRAG_SAVE_MS) this.commit(at)
  }

  /** Attention dropped or the meadow is going away: save anything pending. */
  settle(at: number): void {
    if (this.dirty) this.commit(at)
  }

  private commit(at: number): void {
    this.dirty = false
    this.last = at
    this.save()
  }
}
