// The sun's journey, as numbers: 0 is up, where it stands by day, and 1 is
// down, on the sea. A tap sends it the whole way, a drag moves it with the
// finger, and a tap while it travels by itself turns it round. Nothing on the
// beach changes until it arrives; `step` says when it does.

export type SunHome = 'up' | 'down'
/** Seconds the whole journey takes by itself. */
export const JOURNEY_SECONDS = 4

export type SunEvent = 'arrived-down' | 'arrived-up' | 'back' | null
export type SunSound = 'first' | 'second' | 'hum' | null

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

export class Sun {
  /** Where it set out from, and so where it is saved. */
  home: SunHome
  /** 0 up to 1 down. */
  t: number
  /** At rest, in the hand, on its way to the other side, or on its way back to where it set out from. */
  mode: 'rest' | 'held' | 'travel' | 'back' = 'rest'
  /** A swell when a finger lands on it, 1 falling to 0. */
  pulse = 0
  /** The finger has moved it since it was taken. */
  private dragged = false

  constructor(home: SunHome) {
    this.home = home
    this.t = home === 'down' ? 1 : 0
  }

  private get homeT(): number {
    return this.home === 'down' ? 1 : 0
  }

  /** How far it is from where it set out, 0 to 1. */
  get gone(): number {
    return Math.abs(this.t - this.homeT)
  }

  /** It is travelling by itself, either way. */
  get travelling(): boolean {
    return this.mode === 'travel' || this.mode === 'back'
  }

  /** A finger lands on it. At rest it is taken in the hand; travelling by itself, it turns round. */
  press(): SunSound {
    this.pulse = 1
    if (this.mode === 'rest') {
      this.mode = 'held'
      this.dragged = false
      return 'first'
    }
    if (this.mode === 'travel') {
      this.mode = 'back'
      return 'hum'
    }
    if (this.mode === 'back') {
      this.mode = 'travel'
      return 'second'
    }
    return null
  }

  /** The finger moves it: `t` is where the finger is along its path. */
  drag(t: number): void {
    if (this.mode !== 'held') return
    this.dragged = true
    this.t = clamp01(t)
  }

  /** The finger lets go. A tap sends it the whole way; a drag let go past half way finishes, otherwise it goes back. */
  release(): SunSound {
    if (this.mode !== 'held') return null
    if (!this.dragged || this.gone > 0.5) {
      this.mode = 'travel'
      return 'second'
    }
    this.mode = this.gone > 0 ? 'back' : 'rest'
    return this.gone > 0 ? 'hum' : null
  }

  /** The touch was taken away: the sun in the hand goes back to where it was, without a sound. */
  cancel(): void {
    if (this.mode === 'held') this.mode = this.gone > 0 ? 'back' : 'rest'
  }

  step(dt: number): SunEvent {
    this.pulse = Math.max(0, this.pulse - dt * 3)
    if (this.mode !== 'travel' && this.mode !== 'back') return null
    const to = this.mode === 'travel' ? 1 - this.homeT : this.homeT
    const move = dt / JOURNEY_SECONDS
    if (Math.abs(to - this.t) > move) {
      this.t += Math.sign(to - this.t) * move
      return null
    }
    this.t = to
    const arrived = this.mode === 'travel'
    this.mode = 'rest'
    if (!arrived) return 'back'
    this.home = this.home === 'up' ? 'down' : 'up'
    return this.home === 'down' ? 'arrived-down' : 'arrived-up'
  }
}
