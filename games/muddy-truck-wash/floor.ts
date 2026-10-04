import { KIND, type Landing } from './fx'
import { LAYOUT } from './props'

// What has landed on the floor: water, soft mud, foam and clods of dried mud, as four coarse sheets
// of amounts. None of it is kept. A puddle creeps to the drain and a trail
// dries away, each within seconds of attended play, so the floor a child
// comes back to is the floor every visit starts with and nothing has been
// tidied away behind their back. Pure: the view copies the sheets into a
// texture.

export const FLOOR = { x0: -9, x1: 7, z0: -2.7, z1: 3.7, w: 128, h: 52 } as const
/** Water, soft mud, foam, clods. */
export const SHEETS = 4
/** The sheet of clods: dried mud lies where it fell, pale, and does not run to the drain. */
export const CLODS = 3
/** The drain at the front of the pad, where everything on the floor creeps to. */
export const DRAIN = LAYOUT.drain
/** How fast a mark fades, in amount a second: the thickest is gone in about seven seconds. */
export const DRY = 0.15
/** How fast what lies on the floor creeps toward the drain, in floor units a second. */
export const CREEP = 0.22
/** The floor is stepped at most this often; the frames between cost nothing. */
const STEP = 1 / 30

export class Floor {
  /** Amounts, 0 to 1: for each cell its water, its mud and its foam. */
  amount = new Float32Array(FLOOR.w * FLOOR.h * SHEETS)
  /** Something lies on the floor. */
  live = false
  private scratch = new Float32Array(FLOOR.w * FLOOR.h * SHEETS)
  private owed = 0

  /** Something reached the floor: a drop wets it, a splat muddies it, a blob leaves foam, a crumb of dried mud lies as a clod. */
  land(landing: Landing): void {
    const sheet = landing.kind === KIND.drop ? 0 : landing.kind === KIND.blob ? 2 : landing.kind === KIND.crumb ? CLODS : 1
    this.stamp(landing.x, landing.z, 0.16 + landing.size * 1.6, sheet, landing.strength ?? (landing.kind === KIND.drop ? 0.3 : landing.kind === KIND.crumb ? 1 : 0.75))
  }

  /** Adds a soft round mark. */
  stamp(x: number, z: number, radius: number, sheet: number, amount: number): void {
    const cw = (FLOOR.x1 - FLOOR.x0) / FLOOR.w, ch = (FLOOR.z1 - FLOOR.z0) / FLOOR.h
    const cx = (x - FLOOR.x0) / cw, cz = (z - FLOOR.z0) / ch
    const rx = radius / cw, rz = radius / ch
    for (let j = Math.max(0, Math.floor(cz - rz)); j <= Math.min(FLOOR.h - 1, Math.ceil(cz + rz)); j++) {
      for (let i = Math.max(0, Math.floor(cx - rx)); i <= Math.min(FLOOR.w - 1, Math.ceil(cx + rx)); i++) {
        const d = Math.hypot((i + 0.5 - cx) / rx, (j + 0.5 - cz) / rz)
        if (d >= 1) continue
        const k = (j * FLOOR.w + i) * SHEETS + sheet
        this.amount[k] = Math.min(1, this.amount[k] + amount * (1 - d * d))
        this.live = true
      }
    }
  }

  /**
   * The jet of the hose hits the floor here: the foam lying within its reach is pushed away from the point, along
   * the floor, and none of it is lost on the way. Returns whether any foam moved.
   */
  push(x: number, z: number, reach = 0.9, by = 0.55): boolean {
    const cw = (FLOOR.x1 - FLOOR.x0) / FLOOR.w, ch = (FLOOR.z1 - FLOOR.z0) / FLOOR.h
    const moved: { x: number; z: number; amount: number }[] = []
    for (let j = Math.max(0, Math.floor((z - reach - FLOOR.z0) / ch)); j <= Math.min(FLOOR.h - 1, Math.ceil((z + reach - FLOOR.z0) / ch)); j++) {
      for (let i = Math.max(0, Math.floor((x - reach - FLOOR.x0) / cw)); i <= Math.min(FLOOR.w - 1, Math.ceil((x + reach - FLOOR.x0) / cw)); i++) {
        const k = (j * FLOOR.w + i) * SHEETS + 2
        if (this.amount[k] <= 0) continue
        const px = FLOOR.x0 + (i + 0.5) * cw, pz = FLOOR.z0 + (j + 0.5) * ch
        const d = Math.hypot(px - x, pz - z)
        if (d >= reach) continue
        // Nearest the jet it goes furthest; straight under it, it goes toward the drain.
        const ux = d > 1e-3 ? (px - x) / d : Math.sign(DRAIN.x - x) || 1, uz = d > 1e-3 ? (pz - z) / d : 0
        const far = by * (1 - d / reach) + 0.15
        moved.push({ x: px + ux * far, z: pz + uz * far, amount: this.amount[k] })
        this.amount[k] = 0
      }
    }
    for (const foam of moved) {
      const i = Math.max(0, Math.min(FLOOR.w - 1, Math.floor((foam.x - FLOOR.x0) / cw))), j = Math.max(0, Math.min(FLOOR.h - 1, Math.floor((foam.z - FLOOR.z0) / ch)))
      const k = (j * FLOOR.w + i) * SHEETS + 2
      this.amount[k] = Math.min(1, this.amount[k] + foam.amount)
    }
    if (moved.length) this.live = true
    return moved.length > 0
  }

  /** Attended time passes: what lies on the floor creeps toward the drain and dries. Returns whether anything changed. */
  step(dt: number): boolean {
    if (!this.live) return false
    this.owed += dt
    if (this.owed < STEP) return false
    const t = this.owed
    this.owed = 0
    const cw = (FLOOR.x1 - FLOOR.x0) / FLOOR.w, ch = (FLOOR.z1 - FLOOR.z0) / FLOOR.h
    const from = this.amount, to = this.scratch
    let any = false
    for (let j = 0; j < FLOOR.h; j++) for (let i = 0; i < FLOOR.w; i++) {
      // Each cell takes what was a little further from the drain, so everything moves toward it.
      const x = FLOOR.x0 + (i + 0.5) * cw - DRAIN.x, z = FLOOR.z0 + (j + 0.5) * ch - DRAIN.z
      const far = Math.hypot(x, z) || 1
      const move = Math.min(far, CREEP * t)
      const si = i + ((x / far) * move) / cw, sj = j + ((z / far) * move) / ch
      const i0 = Math.floor(si), j0 = Math.floor(sj), fi = si - i0, fj = sj - j0
      const k = (j * FLOOR.w + i) * SHEETS
      for (let s = 0; s < SHEETS; s++) {
        const at = (a: number, b: number): number => (a < 0 || a >= FLOOR.w || b < 0 || b >= FLOOR.h ? 0 : from[(b * FLOOR.w + a) * SHEETS + s])
        // What is wet creeps; a clod stays where it lies.
        const taken = s === CLODS ? from[k + s] : (at(i0, j0) * (1 - fi) + at(i0 + 1, j0) * fi) * (1 - fj) + (at(i0, j0 + 1) * (1 - fi) + at(i0 + 1, j0 + 1) * fi) * fj
        const left = Math.max(0, taken - DRY * t)
        to[k + s] = left
        if (left > 0) any = true
      }
    }
    this.scratch = from
    this.amount = to
    this.live = any
    return true
  }

  /** How much lies on the floor in all: a test's measure, never shown. */
  total(): number {
    let sum = 0
    for (let k = 0; k < this.amount.length; k++) sum += this.amount[k]
    return sum
  }
}
