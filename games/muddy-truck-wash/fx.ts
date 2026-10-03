// The small things a touch sets loose: bubbles, drops, crumbs, glints, blobs
// of foam and splats of mud. A fixed pool of plain numbers, stepped on game
// time with a seeded stream, so the same touches give the same chain. The view
// draws the pool; the rules never read it.

export const KIND = { bubble: 0, drop: 1, crumb: 2, glint: 3, blob: 4, splat: 5, dust: 6 } as const
export type Kind = (typeof KIND)[keyof typeof KIND]

export const CAPACITY = 260

export type Landing = { kind: Kind; x: number; y: number; z: number; size: number }

const GRAVITY = 7.5

export class Particles {
  count = 0
  readonly x = new Float32Array(CAPACITY)
  readonly y = new Float32Array(CAPACITY)
  readonly z = new Float32Array(CAPACITY)
  readonly vx = new Float32Array(CAPACITY)
  readonly vy = new Float32Array(CAPACITY)
  readonly vz = new Float32Array(CAPACITY)
  readonly size = new Float32Array(CAPACITY)
  readonly age = new Float32Array(CAPACITY)
  readonly life = new Float32Array(CAPACITY)
  readonly kind = new Uint8Array(CAPACITY)
  /** A number per particle for its own wobble or tint. */
  readonly phase = new Float32Array(CAPACITY)
  private seed: number

  constructor(seed = 0x51ed) {
    this.seed = seed >>> 0 || 1
  }

  random(): number {
    let s = this.seed
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    this.seed = s
    return s / 2 ** 32
  }

  /** Adds one. When the pool is full the oldest of the same kind makes room, so a new touch is always answered. */
  emit(kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life: number): void {
    let i = this.count
    if (i >= CAPACITY) {
      i = 0
      let oldest = -1
      for (let k = 0; k < CAPACITY; k++) {
        const share = this.age[k] / this.life[k] + (this.kind[k] === kind ? 1 : 0)
        if (share > oldest) { oldest = share; i = k }
      }
    } else this.count += 1
    this.x[i] = x; this.y[i] = y; this.z[i] = z
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz
    this.size[i] = size; this.age[i] = 0; this.life[i] = life
    this.kind[i] = kind
    this.phase[i] = this.random()
  }

  /** A puff of `n` particles thrown outward from a point. */
  burst(kind: Kind, n: number, x: number, y: number, z: number, speed: number, up: number, size: number, life: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.random() * Math.PI * 2, s = speed * (0.4 + this.random() * 0.8)
      this.emit(kind, x + (this.random() - 0.5) * 0.2, y + (this.random() - 0.5) * 0.2, z, Math.cos(a) * s, up * (0.5 + this.random()) + Math.sin(a) * s * 0.4, 0.3 + this.random() * 0.9, size * (0.6 + this.random() * 0.8), life * (0.7 + this.random() * 0.6))
    }
  }

  /** One step. `landed` hears each thing that reaches the floor or pops, once. */
  step(dt: number, landed?: (landing: Landing) => void): void {
    for (let i = this.count - 1; i >= 0; i--) {
      const kind = this.kind[i] as Kind
      this.age[i] += dt
      let dead = this.age[i] >= this.life[i]
      if (kind === KIND.bubble) {
        // Lifts, slows and wanders; it pops when its time is up.
        this.vy[i] += (0.55 - this.vy[i]) * Math.min(1, dt * 2.5)
        this.vx[i] += (Math.sin(this.age[i] * 3 + this.phase[i] * 20) * 0.25 - this.vx[i]) * Math.min(1, dt * 2)
        this.vz[i] *= Math.exp(-dt * 2)
        if (dead) landed?.({ kind, x: this.x[i], y: this.y[i], z: this.z[i], size: this.size[i] })
      } else if (kind === KIND.glint) {
        this.vx[i] = this.vy[i] = this.vz[i] = 0
      } else if (kind === KIND.dust) {
        this.vx[i] *= Math.exp(-dt * 3); this.vz[i] *= Math.exp(-dt * 3)
        this.vy[i] += (0.25 - this.vy[i]) * Math.min(1, dt * 3)
      } else {
        this.vy[i] -= GRAVITY * (kind === KIND.blob ? 0.45 : 1) * dt
      }
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; this.z[i] += this.vz[i] * dt
      if (!dead && this.y[i] <= 0.02 && this.vy[i] < 0 && kind !== KIND.bubble && kind !== KIND.glint && kind !== KIND.dust) {
        if (kind === KIND.crumb && this.phase[i] < 2) {
          // A crumb bounces once and lies where it stops.
          this.y[i] = 0.02
          this.vy[i] *= -0.3; this.vx[i] *= 0.5; this.vz[i] *= 0.5
          this.phase[i] += 2
        } else if (kind === KIND.crumb) {
          this.y[i] = 0.02
          this.vx[i] = this.vy[i] = this.vz[i] = 0
        } else {
          landed?.({ kind, x: this.x[i], y: 0, z: this.z[i], size: this.size[i] })
          dead = true
        }
      }
      if (dead) {
        const last = --this.count
        if (i !== last) {
          this.x[i] = this.x[last]; this.y[i] = this.y[last]; this.z[i] = this.z[last]
          this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last]; this.vz[i] = this.vz[last]
          this.size[i] = this.size[last]; this.age[i] = this.age[last]; this.life[i] = this.life[last]
          this.kind[i] = this.kind[last]; this.phase[i] = this.phase[last]
        }
      }
    }
  }
}
