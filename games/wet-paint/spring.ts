// A spring: the one way anything here overshoots and settles. It is stepped
// with the seconds it is given and holds no clock of its own.

export class Spring {
  value: number
  speed = 0
  private readonly stiffness: number
  private readonly damping: number

  /** `stiffness` is how hard it is pulled to its target, `damping` how fast it loses its swing. */
  constructor(value: number, stiffness: number, damping: number) {
    this.value = value
    this.stiffness = stiffness
    this.damping = damping
  }

  /** A push: it shows as a swing on the next steps. */
  kick(speed: number): void {
    this.speed += speed
  }

  /** Plays `dt` seconds toward `target`, in pieces short enough to stay steady on a long frame. */
  step(dt: number, target: number): number {
    let left = dt
    while (left > 0) {
      const h = Math.min(left, 1 / 120)
      this.speed += ((target - this.value) * this.stiffness - this.speed * this.damping) * h
      this.value += this.speed * h
      left -= h
    }
    return this.value
  }
}
