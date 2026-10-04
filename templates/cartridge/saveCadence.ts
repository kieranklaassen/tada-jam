// template: cartridge/saveCadence.ts v3 (frozen: do not edit; tune through config.ts)
import { SAVE_THROTTLE_MS } from './config'

// When to hand the state to ctx.storage. The storage layer debounces and the
// shell flushes on put-away; this makes sure the newest state (a piece
// mid-drag, something still settling) is what the last save carried.
// Times are in ms on any one steady clock.

export class SaveCadence {
  private pending = false
  private last = -Infinity
  private readonly write: () => void

  constructor(write: () => void) {
    this.write = write
  }

  /** A meaningful change: save at once when `now` is asked for, otherwise at most once per throttle window. */
  change(time: number, now = false): void {
    this.pending = true
    if (now || time - this.last >= SAVE_THROTTLE_MS) this.flush(time)
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
