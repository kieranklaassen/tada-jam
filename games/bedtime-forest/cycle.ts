// The forest's calm loop: dusk (play) → nightfall (the moon rises) → night
// (stars and the lullaby) → dawn (everyone wakes) → dusk again. Night only
// starts when every animal is asleep, and the loop never counts anything.
// Time here is attended time: it stands still while the forest is put away.

export type Phase = 'dusk' | 'nightfall' | 'night' | 'dawn'

export const SETTLE_BEFORE_NIGHT = 1.2
export const NIGHTFALL_SECONDS = 4.5
export const LULLABY_SECONDS = 26
export const NIGHT_SECONDS = LULLABY_SECONDS + 3
export const DAWN_SECONDS = 9
export const WAKE_START = 1.2
export const WAKE_GAP = 1.2
/** After dawn the morning light eases back to dusk over this long. */
export const MORNING_FADE = 24

export type Sky = {
  /** 0 dusk, 1 deep night. */
  night: number
  /** 0 none, 1 fresh morning light. */
  morning: number
  /** 0 below the treeline, 1 fully risen. */
  moon: number
  /** 0 none, 1 every star out. */
  stars: number
}

export class ForestCycle {
  phase: Phase = 'dusk'
  /** Seconds in the current phase. */
  t = 0
  private allAsleepFor = 0
  /** Seconds since the last dawn ended (drives the morning fade). */
  private sinceDawn = MORNING_FADE
  /** Set on the frame a phase starts, for sound and events. */
  entered: Phase | null = null
  readonly sky: Sky = { night: 0, morning: 0, moon: 0, stars: 0 }

  /** Start the night straight away (a forest saved with everyone asleep). */
  startNight(): void {
    this.enter('nightfall')
  }

  step(dt: number, allAsleep: boolean): void {
    this.entered = null
    this.t += dt
    switch (this.phase) {
      case 'dusk':
        this.sinceDawn += dt
        this.allAsleepFor = allAsleep ? this.allAsleepFor + dt : 0
        if (this.allAsleepFor >= SETTLE_BEFORE_NIGHT) this.enter('nightfall')
        break
      case 'nightfall':
        if (this.t >= NIGHTFALL_SECONDS) this.enter('night')
        break
      case 'night':
        if (this.t >= NIGHT_SECONDS) this.enter('dawn')
        break
      case 'dawn':
        if (this.t >= DAWN_SECONDS) {
          this.sinceDawn = 0
          this.enter('dusk')
        }
        break
      default: {
        const unreachable: never = this.phase
        return unreachable
      }
    }
    this.updateSky()
  }

  /** Is it time for the animal at this place in the wake order to wake? */
  wakeDue(order: number): boolean {
    return this.phase === 'dawn' && this.t >= WAKE_START + order * WAKE_GAP
  }

  /** Animals can be picked up and carried only while it is dusk or dawn. */
  get playful(): boolean {
    return this.phase === 'dusk' || this.phase === 'dawn'
  }

  private enter(phase: Phase): void {
    this.phase = phase
    this.t = 0
    this.allAsleepFor = 0
    this.entered = phase
  }

  private updateSky(): void {
    const sky = this.sky
    const t = this.t
    switch (this.phase) {
      case 'dusk': {
        sky.night = 0
        sky.moon = 0
        sky.stars = 0
        sky.morning = 1 - smooth(this.sinceDawn / MORNING_FADE)
        break
      }
      case 'nightfall': {
        const k = smooth(t / NIGHTFALL_SECONDS)
        sky.night = k
        sky.moon = 0.55 * smooth((t - 0.8) / (NIGHTFALL_SECONDS - 0.8))
        sky.stars = 0.15 * smooth((t - 2.5) / 2)
        sky.morning = 0
        break
      }
      case 'night': {
        sky.night = 1
        sky.moon = 0.55 + 0.45 * smooth(t / 10)
        sky.stars = 0.15 + 0.85 * smooth(t / 9)
        sky.morning = 0
        break
      }
      case 'dawn': {
        const k = smooth(t / 5)
        sky.night = 1 - k
        sky.moon = 1 - smooth(t / 4)
        sky.stars = 1 - smooth(t / 3.5)
        sky.morning = smooth(t / 4)
        break
      }
      default: {
        const unreachable: never = this.phase
        return unreachable
      }
    }
  }
}

function smooth(x: number): number {
  const k = Math.min(1, Math.max(0, x))
  return k * k * (3 - 2 * k)
}
