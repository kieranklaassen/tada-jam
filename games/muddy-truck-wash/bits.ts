// The few pieces of the place that move and answer a touch: the roller brush
// at the wall, the pinwheel in the yard, what stands on the shelf, and the
// lamp on its rod. Each
// goes on by itself on attended time and does more when it is touched. None
// changes anything a wash is made of, and nothing about them is saved. Pure.

export type BitId = 'roller' | 'pinwheel' | 'shelf' | 'lamp'

/** The roller turns this fast left to itself, and this fast just after a touch, in radians a second. */
const ROLLER_IDLE = 0.7
const ROLLER_SPUN = 15
const PINWHEEL_SPUN = 24
/** How hard a knock throws what stands on the shelf, and how it falls back. */
const SHELF_JUMP = 2.3
const SHELF_GRAVITY = 15
/** How fast a knock sets the lamp swinging, and the furthest it swings on its rod, in radians. */
const LAMP_KNOCK = 2.4
const LAMP_SWING = 0.45

export class Bits {
  /** The roller's and the pinwheel's angle, in radians. */
  roller = 0
  pinwheel = 0
  /** How far what stands on the shelf is off its board. */
  shelf = 0
  /** How far the lamp has swung on its rod, in radians. */
  lamp = 0
  private lampSpeed = 0
  private rollerSpeed = ROLLER_IDLE
  private pinwheelSpeed = 1.5
  private shelfSpeed = 0
  private seconds = 0

  /** The wind in the yard: it never drops to nothing and has no beat. */
  private wind(): number {
    return 1.7 + 1.1 * Math.sin(this.seconds * 0.31) + 0.7 * Math.sin(this.seconds * 0.83 + 1.3)
  }

  /** A touch on one of them. Returns false when it is already doing all it can, so the touch still gets its sound and nothing piles up. */
  poke(id: BitId): boolean {
    if (id === 'roller') {
      const fresh = this.rollerSpeed < ROLLER_SPUN * 0.6
      this.rollerSpeed = ROLLER_SPUN
      return fresh
    }
    if (id === 'pinwheel') {
      const fresh = this.pinwheelSpeed < PINWHEEL_SPUN * 0.6
      this.pinwheelSpeed = PINWHEEL_SPUN
      return fresh
    }
    if (id === 'lamp') {
      // One knock gives it one swing's worth: knocked again and again it swings no higher.
      const fresh = Math.abs(this.lampSpeed) < LAMP_KNOCK * 0.5
      this.lampSpeed = this.lamp >= 0 ? LAMP_KNOCK : -LAMP_KNOCK
      return fresh
    }
    // The shelf's things jump only from the board: knocked in the air they are not thrown higher.
    if (this.shelf > 0) return false
    this.shelfSpeed = SHELF_JUMP
    this.shelf = 1e-4
    return true
  }

  step(dt: number): void {
    this.seconds += dt
    this.rollerSpeed += (ROLLER_IDLE - this.rollerSpeed) * Math.min(1, dt * 1.1)
    this.roller += this.rollerSpeed * dt
    this.pinwheelSpeed += (this.wind() - this.pinwheelSpeed) * Math.min(1, dt * 0.8)
    this.pinwheel += this.pinwheelSpeed * dt
    if (this.lamp !== 0 || this.lampSpeed !== 0) {
      // It hangs: a swing dies away by itself, and it can only swing so far.
      this.lampSpeed += (-26 * this.lamp - 1.1 * this.lampSpeed) * dt
      this.lamp += this.lampSpeed * dt
      if (Math.abs(this.lamp) > LAMP_SWING) {
        this.lamp = Math.sign(this.lamp) * LAMP_SWING
        this.lampSpeed *= -0.3
      }
      if (Math.abs(this.lamp) < 1e-3 && Math.abs(this.lampSpeed) < 1e-2) this.lamp = this.lampSpeed = 0
    }
    if (this.shelf > 0 || this.shelfSpeed !== 0) {
      this.shelfSpeed -= SHELF_GRAVITY * dt
      this.shelf += this.shelfSpeed * dt
      if (this.shelf <= 0) {
        // One small bounce, then they stand.
        this.shelf = 0
        this.shelfSpeed = this.shelfSpeed < -1.2 ? -this.shelfSpeed * 0.3 : 0
        if (this.shelfSpeed > 0) this.shelf = 1e-4
      }
    }
  }
}
