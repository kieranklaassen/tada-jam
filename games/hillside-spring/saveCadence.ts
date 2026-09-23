// When to hand the garden to ctx.storage. Building saves at once; growing
// plots change every frame, so those save at most once per window and once
// more when growth settles. Storage debounces too, and the shell flushes on
// put-away, so the newest garden is always what the last save carried.

export const GROWTH_SAVE_WINDOW = 2

export class SaveCadence {
  private dirty = false
  private lastSave = -Infinity
  private readonly save: () => void
  private readonly window: number

  constructor(save: () => void, window = GROWTH_SAVE_WINDOW) {
    this.save = save
    this.window = window
  }

  /** Something the child did: save now. */
  now(time: number): void {
    this.commit(time)
  }

  /** Something that keeps changing (a plot growing): save at most once per window. */
  soon(time: number): void {
    this.dirty = true
    if (time - this.lastSave >= this.window) this.commit(time)
  }

  /** Growth stopped, attention dropped, or the page is hiding: save anything pending. */
  settle(time: number): void {
    if (this.dirty) this.commit(time)
  }

  private commit(time: number): void {
    this.dirty = false
    this.lastSave = time
    this.save()
  }
}
