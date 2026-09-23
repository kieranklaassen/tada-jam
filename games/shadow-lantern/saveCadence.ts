// When to hand the theatre to ctx.storage. The storage layer debounces and
// the shell flushes on put-away; this only makes sure the newest arrangement,
// including a shape mid-drag, is always what the last save() carried.

export const DRAG_SAVE_THROTTLE_MS = 400

export class SaveCadence {
  private dirty = false
  private lastSave = -Infinity
  private readonly save: () => void
  private readonly throttleMs: number

  constructor(save: () => void, throttleMs = DRAG_SAVE_THROTTLE_MS) {
    this.save = save
    this.throttleMs = throttleMs
  }

  /** Something changed. Saves now if `immediate`, otherwise at most once per throttle window. */
  change(now: number, immediate = false): void {
    this.dirty = true
    if (immediate || now - this.lastSave >= this.throttleMs) this.commit(now)
  }

  /** Attention dropped, the page is hiding, or a gesture ended: save any pending change. */
  settle(now: number): void {
    if (this.dirty) this.commit(now)
  }

  private commit(now: number): void {
    this.dirty = false
    this.lastSave = now
    this.save()
  }
}
