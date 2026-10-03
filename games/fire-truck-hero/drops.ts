// The drops of water in the air, as numbers. No renderer: waterView.ts copies
// them onto one instanced mesh. A gulp is a fat blob with a few drops round
// it, a stream fills the gaps between gulps with small drops, and every drop
// that lands throws up a splash and leaves its mark on the sand. The splash
// drops fall back and leave their own small dots, and mud throws brown blobs.
//
// The drops are only how the water looks. How much water there is, and when a
// gulp lands, is the hose's (hose.ts), and is the same on every quality tier.
// The stream here is fixed, so the same play draws the same drops.

import { pointOn, type Arc, type Vec3 } from './jet'

/** The most drops in the air at once. The view draws them in one call. */
export const CAPACITY = 220
/** Drops in one gulp: one fat one that leads, and these many round it. */
export const DROPS_PER_GULP = 7
/** Splash drops thrown up by a landing. */
export const SPLASH_PER_LANDING = 2
/** How hard the yard pulls a splash drop down, in yard units a second squared. */
export const SPLASH_GRAVITY = 16
/** The dot a splash drop leaves where it falls back: how dark (as a share of a gulp's blot) and how wide. It is a mark and no water. */
export const DOT = { dark: 0.3, radius: 0.16 } as const
/** Brown blobs thrown by a landing on mud. */
export const BLOBS_PER_LANDING = 4

/** What a landing leaves on the sand: where, how much water (in gulps) and how wide. */
export type Landing = (x: number, z: number, gulps: number, radius: number) => void
/** Where a thrown drop fell back. */
export type Dot = (x: number, z: number) => void

type Drop = {
  alive: boolean
  /** A jet drop rides an arc; a splash drop is thrown and falls. */
  arc: Arc | null
  t: number
  /** How far off the arc's landing point this drop comes down. */
  offX: number
  offZ: number
  size: number
  /** Water it carries, in gulps, and how wide its mark is. */
  gulps: number
  mark: number
  /** A thrown drop that leaves a dot where it falls back. */
  dots: boolean
  /** A blob of mud, drawn brown. */
  brown: boolean
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
}

const scratch: Vec3 = { x: 0, y: 0, z: 0 }

export class Drops {
  /** How many are in the air. */
  alive = 0
  /** Slots looked at in the last step: the work, counted for the frame-budget test. */
  visited = 0
  private readonly slots: Drop[] = []
  private seed: number

  constructor(seed = 0x51ed270b) {
    this.seed = seed >>> 0 || 1
    for (let i = 0; i < CAPACITY; i++) {
      this.slots.push({ alive: false, arc: null, t: 0, offX: 0, offZ: 0, size: 0, gulps: 0, mark: 0, dots: false, brown: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 })
    }
  }

  /** A gulp leaves the nozzle: the fat blob and the drops round it, a little spread in time and place. */
  gulp(arc: Arc): void {
    const each = 1 / (DROPS_PER_GULP + 3)
    // The lead drop carries most of the water and lands dead on.
    this.jet(arc, 0, 0, 0, 0.36, each * 4, 0.85)
    for (let i = 0; i < DROPS_PER_GULP - 1; i++) {
      this.jet(arc, -0.012 - this.random() * 0.07, (this.random() - 0.5) * 0.9, (this.random() - 0.5) * 0.9, 0.16 + this.random() * 0.11, each, 0.58)
    }
  }

  /** One small drop of a stream, to fill the gap between two gulps. It carries no water of its own, only a mark, so that a sweep leaves a line. */
  trickle(arc: Arc): void {
    this.jet(arc, 0, (this.random() - 0.5) * 0.34, (this.random() - 0.5) * 0.34, 0.14 + this.random() * 0.08, 0.14, 0.62)
  }

  /** The small spit with which the truck shows a new thing: three little drops that leave no mark and carry no water. */
  spit(arc: Arc): void {
    for (let i = 0; i < 3; i++) this.jet(arc, -i * 0.03, (this.random() - 0.5) * 0.2, (this.random() - 0.5) * 0.2, 0.1 + this.random() * 0.04, 0, 0)
  }

  /** Brown blobs thrown up out of mud by a landing. They fall back and leave no water. */
  blobs(x: number, z: number, count = BLOBS_PER_LANDING): void {
    for (let i = 0; i < count; i++) {
      const drop = this.throwUp(x, z, 0.42, false)
      if (!drop) return
      drop.brown = true
    }
  }

  /** One drop that lets go of something wet (a log, a leaf, a tipped flower) and falls. */
  drip(x: number, y: number, z: number, out = 0): void {
    const drop = this.free()
    if (!drop) return
    const turn = this.random() * Math.PI * 2
    drop.arc = null
    drop.size = 0.085
    drop.x = x
    drop.y = y
    drop.z = z
    drop.vx = Math.cos(turn) * out
    drop.vz = Math.sin(turn) * out
    drop.vy = 1.1
    this.asThrown(drop, true)
  }

  /** Drops flung from a place: off the paddles of the wheel, or off a cat who shakes herself. They fall and leave their dots. */
  burst(x: number, y: number, z: number, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const drop = this.free()
      if (!drop) return
      const turn = ((i + this.random()) / count) * Math.PI * 2
      drop.arc = null
      this.asThrown(drop, true)
      drop.size = 0.07 + this.random() * 0.05
      drop.x = x
      drop.y = y
      drop.z = z
      drop.vx = Math.cos(turn) * speed * (0.7 + this.random() * 0.6)
      drop.vz = Math.sin(turn) * speed * (0.7 + this.random() * 0.6)
      drop.vy = 1.6 + this.random() * 2.4
    }
  }

  /**
   * One frame. Each drop that reaches the ground is handed to `land`, and throws up `splash` small drops (fewer
   * on a low tier). Each thrown drop that falls back is handed to `dot`.
   */
  step(seconds: number, land: Landing, splash = SPLASH_PER_LANDING, dot?: Dot): void {
    this.visited = 0
    if (!(seconds > 0)) return
    for (const drop of this.slots) {
      this.visited++
      if (!drop.alive) continue
      if (drop.arc) {
        drop.t += seconds
        if (drop.t < 0) continue
        const share = Math.min(1, drop.t / drop.arc.seconds)
        pointOn(drop.arc, drop.t, scratch)
        const x = scratch.x + drop.offX * share, z = scratch.z + drop.offZ * share
        drop.vx = (x - drop.x) / seconds
        drop.vy = (scratch.y - drop.y) / seconds
        drop.vz = (z - drop.z) / seconds
        drop.x = x
        drop.y = scratch.y
        drop.z = z
        if (drop.t >= drop.arc.seconds) {
          this.kill(drop)
          // A drop with no mark is a show, not water: it lands without a trace, and so does its splash.
          // Its slot is free from here on and a splash drop may take it, so what it was is read first.
          const water = drop.mark > 0, size = drop.size
          if (water) land(x, z, drop.gulps, drop.mark)
          for (let i = 0; i < (water ? splash : 1); i++) this.throwUp(x, z, size, water)
        }
      } else {
        drop.vy -= SPLASH_GRAVITY * seconds
        drop.x += drop.vx * seconds
        drop.y += drop.vy * seconds
        drop.z += drop.vz * seconds
        if (drop.y <= 0) {
          this.kill(drop)
          // A drop that falls back leaves its own small dot.
          if (drop.dots) dot?.(drop.x, drop.z)
        }
      }
    }
  }

  /** Calls `draw` for each drop that can be seen, with its place, its speed, its size, and whether it is a blob of mud. */
  each(draw: (x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, brown: boolean) => void): void {
    for (const drop of this.slots) {
      if (drop.alive && (drop.arc === null || drop.t >= 0)) draw(drop.x, drop.y, drop.z, drop.vx, drop.vy, drop.vz, drop.size, drop.brown)
    }
  }

  /** The game goes to rest: nothing hangs in the air while it is away. */
  clear(): void {
    for (const drop of this.slots) drop.alive = false
    this.alive = 0
  }

  private jet(arc: Arc, t: number, offX: number, offZ: number, size: number, gulps: number, mark: number): void {
    const drop = this.free()
    if (!drop) return
    drop.arc = arc
    drop.t = t
    drop.offX = offX
    drop.offZ = offZ
    drop.size = size
    drop.gulps = gulps
    drop.mark = mark
    drop.dots = false
    drop.brown = false
    drop.x = arc.from.x
    drop.y = arc.from.y
    drop.z = arc.from.z
    drop.vx = drop.vy = drop.vz = 0
  }

  /** What a thrown drop is: water that leaves a dot where it falls, or a show that leaves nothing. */
  private asThrown(drop: Drop, dots: boolean): void {
    drop.brown = false
    drop.gulps = 0
    drop.mark = 0
    drop.dots = dots
  }

  private throwUp(x: number, z: number, size: number, dots: boolean): Drop | null {
    const drop = this.free()
    if (!drop) return null
    const turn = this.random() * Math.PI * 2, out = 0.8 + this.random() * 1.6
    drop.arc = null
    this.asThrown(drop, dots)
    drop.size = Math.max(0.05, size * (0.3 + this.random() * 0.25))
    drop.x = x
    drop.y = 0.02
    drop.z = z
    drop.vx = Math.cos(turn) * out
    drop.vz = Math.sin(turn) * out
    drop.vy = 2.6 + this.random() * 2.2
    return drop
  }

  /** A free slot, or none when the air is full: a drop too many is not drawn, and the water it stood for still lands. */
  private free(): Drop | null {
    if (this.alive >= CAPACITY) return null
    for (const drop of this.slots) {
      if (!drop.alive) {
        drop.alive = true
        this.alive++
        return drop
      }
    }
    return null
  }

  private kill(drop: Drop): void {
    drop.alive = false
    this.alive--
  }

  private random(): number {
    this.seed ^= this.seed << 13
    this.seed ^= this.seed >>> 17
    this.seed ^= this.seed << 5
    return (this.seed >>> 0) / 2 ** 32
  }
}
