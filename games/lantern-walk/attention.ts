// template: cartridge/attention.ts v3 (frozen: do not edit; tune through config.ts)
import { LONGEST_FRAME_S } from './config'

// Attention. A game runs only while the child attends and the page is visible.
// Otherwise its loop, its clock and its sound stop where they are. A parked
// game stays mounted and its unmount cleanup does not run, so this is watched
// for the whole life of the Mount.

/** What is read of `document`: whether the page is hidden, and when that changes. */
export type VisibilitySource = {
  readonly hidden: boolean
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

export class Attention {
  /** Attended and not hidden. False until `set` is first called. */
  awake = false
  private attended = false
  private readonly source: VisibilitySource
  private readonly onChange: (awake: boolean) => void
  private readonly onVisibility = (): void => this.apply()

  /** `onChange` is called each time the game wakes or goes to rest, and never twice in a row with the same value. */
  constructor(source: VisibilitySource, onChange: (awake: boolean) => void) {
    this.source = source
    this.onChange = onChange
    source.addEventListener('visibilitychange', this.onVisibility)
  }

  /** Pass `ctx.attention.attended` once at mount and again whenever it changes. */
  set(attended: boolean): void {
    this.attended = attended
    this.apply()
  }

  dispose(): void {
    this.source.removeEventListener('visibilitychange', this.onVisibility)
  }

  private apply(): void {
    const awake = this.attended && !this.source.hidden
    if (awake === this.awake) return
    this.awake = awake
    this.onChange(awake)
  }
}

/**
 * The game's clock: seconds of attended play. It stands still while the game
 * rests, so nothing timed on it (a scene, the idle guidance, an animation)
 * moves while nobody is watching.
 */
export class AttendedClock {
  /** Seconds of attended play so far. */
  seconds = 0
  /** The last frame's interval in ms as the display gave it, uncapped; 0 on the first frame after a rest. The governor samples this. */
  intervalMs = 0
  private last: number | null = null

  /** One frame, given its timestamp in ms. Returns the step to play in seconds: 0 on the first frame after a rest, and never more than the longest frame in config.ts. */
  advance(nowMs: number): number {
    this.intervalMs = this.last === null ? 0 : Math.max(0, nowMs - this.last)
    this.last = nowMs
    const step = Math.min(LONGEST_FRAME_S, this.intervalMs / 1000)
    this.seconds += step
    return step
  }

  /** The game went to rest: the time until the next frame is not played. */
  rest(): void {
    this.last = null
    this.intervalMs = 0
  }
}
