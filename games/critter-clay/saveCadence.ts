// When to hand the workshop to ctx.storage. The storage layer debounces and
// the shell flushes on put-away; this only makes sure the newest bench
// (including critters mid-walk) is what the last save() carried, without
// calling save() on every frame while critters wander.

export const WANDER_SAVE_THROTTLE_MS = 1500

export class SaveCadence {
  private dirty = false
  private lastSave = -Infinity

  constructor(
    private readonly save: () => void,
    private readonly throttleMs = WANDER_SAVE_THROTTLE_MS,
  ) {}

  /** Something the child did changed the bench: save now. */
  now(at: number): void {
    this.commit(at)
  }

  /** Something drifted (critters walking): save at most once per throttle window. */
  drift(at: number): void {
    this.dirty = true
    if (at - this.lastSave >= this.throttleMs) this.commit(at)
  }

  /** Attention dropped or the game is going away: save any pending change. */
  settle(at: number): void {
    if (this.dirty) this.commit(at)
  }

  private commit(at: number): void {
    this.dirty = false
    this.lastSave = at
    this.save()
  }
}
