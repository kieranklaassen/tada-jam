import { seeded } from './motion'

// The grains a landing or a knock throws up: a small fixed pool of points that
// fly, fall back and are gone. Pure, on game time. They have no body: they
// mark nothing and touch nothing.

export const MAX_GRAINS = 72
const GRAVITY = 20

export class Grains {
  /** x, y, z for each grain; a grain at rest sits below the sand at y = -1. */
  readonly positions = new Float32Array(MAX_GRAINS * 3)
  private readonly velocity = new Float32Array(MAX_GRAINS * 3)
  private readonly alive = new Uint8Array(MAX_GRAINS)
  private next = 0
  private readonly random: () => number
  /** Grains in the air now. */
  flying = 0

  constructor(seed = 5) {
    this.random = seeded(seed)
    for (let i = 0; i < MAX_GRAINS; i++) this.positions[i * 3 + 1] = -1
  }

  /** Throws `count` grains from (x, z) on the sand. `power` is 0 to 1; `across` spreads them along z, as under the plank's end. */
  burst(x: number, z: number, power: number, count: number, across = 0): void {
    const p = Math.min(1, Math.max(0.1, power))
    for (let n = 0; n < Math.min(count, MAX_GRAINS); n++) {
      const i = this.next
      this.next = (this.next + 1) % MAX_GRAINS
      const angle = this.random() * Math.PI * 2, out = (0.6 + this.random() * 1.6) * p
      this.positions[i * 3] = x + (this.random() - 0.5) * 0.2
      this.positions[i * 3 + 1] = 0.03
      this.positions[i * 3 + 2] = z + (this.random() - 0.5) * across
      this.velocity[i * 3] = Math.cos(angle) * out
      this.velocity[i * 3 + 1] = (2.2 + this.random() * 3.4) * p
      this.velocity[i * 3 + 2] = Math.sin(angle) * out
      if (!this.alive[i]) this.flying += 1
      this.alive[i] = 1
    }
  }

  step(dt: number): void {
    if (this.flying === 0) return
    for (let i = 0; i < MAX_GRAINS; i++) {
      if (!this.alive[i]) continue
      this.velocity[i * 3 + 1] -= GRAVITY * dt
      this.positions[i * 3] += this.velocity[i * 3] * dt
      this.positions[i * 3 + 1] += this.velocity[i * 3 + 1] * dt
      this.positions[i * 3 + 2] += this.velocity[i * 3 + 2] * dt
      if (this.positions[i * 3 + 1] <= 0) {
        this.positions[i * 3 + 1] = -1
        this.alive[i] = 0
        this.flying -= 1
      }
    }
  }
}
