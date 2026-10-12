import { CAST, HEAPS } from './clearing'
import type { Kind } from './parts'
import type { Rng } from './rng'
import { STAGE } from './stage'

// What is in the air by itself: the leaves that drift down from the tree
// tops at rest and that a gust tears off, the parts that flutter back to
// their heaps, and the gust. All of it is short-lived and none of it is
// saved. Nothing here draws.

export type Leaf = { x: number; y: number; vx: number; vy: number; turn: number; spin: number; sway: number; hue: number; age: number; lasts: number }

/** A part on its way back to its heap. */
export type Stray = { kind: Kind; look: number; fromX: number; fromY: number; t: number; lasts: number; turn: number; /** It left in a scene: its landing is one of the scene's sounds. */ scene: boolean; /** The very part it was on a creature, or null: the view shows it in the air once the creature's picture no longer shows it. */ was: object | null }

/** A gust lasts this long from the first breath. */
export const GUST_SECONDS = 1.5

export class Air {
  readonly leaves: Leaf[] = []
  readonly strays: Stray[] = []
  /** Seconds since the gust began, or -1 with no gust. */
  gust = -1
  /** The most leaves in the air at once; the quality tier sets it. */
  most = 8

  /** One leaf comes loose near a point of the tree tops. */
  loosen(x: number, y: number, rng: Rng, push = 0): void {
    if (this.leaves.length >= this.most) return
    this.add(x, y, rng, push)
  }

  private add(x: number, y: number, rng: Rng, push: number): void {
    this.leaves.push({
      x: x + (rng.next() - 0.5) * 60, y: y + (rng.next() - 0.5) * 30,
      vx: (rng.next() - 0.5) * 24 + push * (180 + rng.next() * 220), vy: 16 + rng.next() * 20 + Math.abs(push) * 60,
      turn: rng.next() * 6.28, spin: (rng.next() - 0.5) * 3 + push * 5, sway: rng.next() * 6.28, hue: Math.floor(rng.next() * 4), age: 0, lasts: 5 + rng.next() * 4,
    })
  }

  /**
   * A finger shakes a leaf loose at a point, and one always comes: there is no sound of a leaf without a leaf. With
   * as many in the air as there may be, the one nearest the end of its fall gives up its place.
   */
  shake(x: number, y: number, rng: Rng): void {
    if (this.leaves.length >= this.most && this.leaves.length > 0) {
      let last = 0
      for (let i = 1; i < this.leaves.length; i++) if (this.leaves[i].lasts - this.leaves[i].age < this.leaves[last].lasts - this.leaves[last].age) last = i
      this.leaves.splice(last, 1)
    }
    // Its own leaf comes even with more in the air than there may be, as after a step down in quality: one went, one comes.
    this.add(x, y, rng, 0)
  }

  /** The wind children blow: the gust begins and leaves leave the tree tops on both sides. */
  blow(who: 'big' | 'small', rng: Rng): void {
    if (who === 'big') this.gust = 0
    const from = CAST[who], push = who === 'big' ? 1 : -1
    for (let i = 0; i < 5; i++) this.loosen(from.x + push * (60 + rng.next() * 160), from.y + 30 + rng.next() * 50, rng, push)
  }

  /** Sends a part back to its heap from where it is. */
  sendHome(kind: Kind, look: number, x: number, y: number, turn: number, scene = false, was: object | null = null): void {
    const far = Math.hypot(HEAPS[kind].x - x, HEAPS[kind].y - y)
    this.strays.push({ kind, look, fromX: x, fromY: y, t: 0, lasts: 0.35 + far / 1300, turn, scene, was })
  }

  /** Steps the air. Calls `home` for each part that lands back in its heap in this step. */
  step(dt: number, home: (kind: Kind, scene: boolean) => void): void {
    if (this.gust >= 0) { this.gust += dt; if (this.gust > GUST_SECONDS) this.gust = -1 }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i]
      leaf.age += dt
      leaf.sway += dt * 2.3
      leaf.vx *= 1 - Math.min(1, dt * 1.6)
      leaf.x += (leaf.vx + Math.sin(leaf.sway) * 26) * dt
      leaf.y += leaf.vy * dt
      leaf.turn += leaf.spin * dt
      if (leaf.age >= leaf.lasts || leaf.y > STAGE.height + 40) this.leaves.splice(i, 1)
    }
    for (let i = this.strays.length - 1; i >= 0; i--) {
      const stray = this.strays[i]
      stray.t += dt
      stray.turn += dt * 7
      if (stray.t >= stray.lasts) { this.strays.splice(i, 1); home(stray.kind, stray.scene) }
    }
  }
}

/** Where a stray is now: an arc from where it was let go to its heap. */
export function strayAt(stray: Stray, out: { x: number; y: number }): { x: number; y: number } {
  const u = Math.min(1, stray.t / stray.lasts), e = u * u * (3 - 2 * u), to = HEAPS[stray.kind]
  out.x = stray.fromX + (to.x - stray.fromX) * e
  out.y = stray.fromY + (to.y - stray.fromY) * e - Math.sin(u * Math.PI) * 70
  return out
}
