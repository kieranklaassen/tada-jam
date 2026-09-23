// When to hand the state to ctx.storage. Storage debounces and the shell
// flushes on put-away; this only makes sure the newest scarf, including a
// stroke of painting still in progress, is what the last save() carried.

export const STROKE_SAVE_THROTTLE_MS = 400

export class SaveCadence {
  private dirty = false
  private lastSave = -Infinity
  private readonly save: () => void
  private readonly throttleMs: number

  constructor(save: () => void, throttleMs = STROKE_SAVE_THROTTLE_MS) {
    this.save = save
    this.throttleMs = throttleMs
  }

  /** Something changed: save now if `immediate`, otherwise at most once per throttle window. */
  change(now: number, immediate = false): void {
    this.dirty = true
    if (immediate || now - this.lastSave >= this.throttleMs) this.commit(now)
  }

  /** A stroke ended, attention dropped, or the page is hiding: save anything pending. */
  settle(now: number): void {
    if (this.dirty) this.commit(now)
  }

  private commit(now: number): void {
    this.dirty = false
    this.lastSave = now
    this.save()
  }
}
