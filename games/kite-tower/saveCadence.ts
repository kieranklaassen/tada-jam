// When to hand the playroom to ctx.storage. The storage layer debounces and
// the shell flushes on put-away; this makes sure the newest poses (a piece
// mid-drag, a tower still settling) are what the last save carried.

export const DRAG_SAVE_MS = 400

export class SaveCadence {
  private pending = false
  private last = -Infinity
  private readonly write: () => void
  private readonly gap: number

  constructor(write: () => void, gap = DRAG_SAVE_MS) {
    this.write = write
    this.gap = gap
  }

  /** A meaningful change: save now when `now` is asked for, otherwise at most once per gap. */
  change(time: number, now = false): void {
    this.pending = true
    if (now || time - this.last >= this.gap) this.flush(time)
  }

  /** Things are still moving; remember to save when they come to rest. */
  mark(): void {
    this.pending = true
  }

  /** At rest, unattended, or hiding: write anything pending. */
  settle(time: number): void {
    if (this.pending) this.flush(time)
  }

  private flush(time: number): void {
    this.pending = false
    this.last = time
    this.write()
  }
}
