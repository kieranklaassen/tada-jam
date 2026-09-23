// When to hand the forest to ctx.storage. The storage layer debounces and
// the shell flushes on put-away; this only makes sure the newest forest is
// what the last save() carried, without calling save() every frame while an
// animal is being carried around.

export const CARRY_SAVE_THROTTLE_MS = 500

export class SaveCadence {
  private dirty = false
  private lastSave = -Infinity
  private readonly save: () => void
  private readonly throttleMs: number

  constructor(save: () => void, throttleMs = CARRY_SAVE_THROTTLE_MS) {
    this.save = save
    this.throttleMs = throttleMs
  }

  /** Something changed. Saves now if `immediate`, otherwise at most once per throttle window. */
  change(now: number, immediate = false): void {
    this.dirty = true
    if (immediate || now - this.lastSave >= this.throttleMs) this.commit(now)
  }

  /** The forest came to rest, attention dropped, or the page is hiding: save any pending change. */
  settle(now: number): void {
    if (this.dirty) this.commit(now)
  }

  private commit(now: number): void {
    this.dirty = false
    this.lastSave = now
    this.save()
  }
}
