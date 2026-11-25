import { CAST, FIGURES, STAND, type Id } from './cast'
import type { Game, Small } from './game'
import { EASEL, HUNG, KEY, MAESTRO, NAILS, PICTURE, SPOTS, STEPS, childView, headOf, inRoom, seenFrom, type P3, type View } from './layout'
import { placeOf, type Place } from './table'

// What lies under a finger, in the surface's own pixels.

export type Target = { kind: 'sitter'; id: Id } | { kind: 'nail'; n: number } | { kind: 'small'; what: Small } | { kind: 'air' }
export type Spot2 = { x: number; y: number }

/** Where the home control and the grown-up's corner are: nothing of the game answers there. */
export const HOME = { radius: 44, y: 34 } as const
export const inHome = (x: number, y: number, width: number): boolean => Math.hypot(x - width / 2, y - HOME.y) <= HOME.radius

type Rect = { x0: number; y0: number; x1: number; y1: number }
const PAD = 10

export class Aim {
  private view: View = childView(1180, 820)
  width = 0
  height = 0

  size(width: number, height: number): void {
    this.width = width
    this.height = height
    this.view = childView(width, height)
  }
  get seeing(): View { return this.view }

  px(p: P3): Spot2 {
    const s = seenFrom(this.view, p)
    return { x: (s.x + 1) * 0.5 * this.width, y: (1 - s.y) * 0.5 * this.height }
  }

  private rect(points: readonly P3[]): Rect {
    const r: Rect = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    for (const p of points) {
      const s = this.px(p)
      r.x0 = Math.min(r.x0, s.x); r.x1 = Math.max(r.x1, s.x); r.y0 = Math.min(r.y0, s.y); r.y1 = Math.max(r.y1, s.y)
    }
    return r
  }
  private flat(at: P3, w: number, h: number): Rect {
    return this.rect([{ x: at.x - w / 2, y: at.y - h / 2, z: at.z }, { x: at.x + w / 2, y: at.y + h / 2, z: at.z }])
  }

  /** How far a point is outside a sitter's shape: 0 inside. */
  private outside(game: Game, id: Id, x: number, y: number): number {
    const pose = game.poses[id], turn = pose.yaw / (Math.PI / 2), figure = FIGURES[id]
    let best = Infinity
    const boxes = [figure.body, figure.head, { x: 0, y: -STAND.h / 2, z: 0, hx: STAND.r, hy: STAND.h / 2, hz: 0.3 }]
    for (const box of boxes) {
      const points: P3[] = []
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) points.push(inRoom(pose, turn, box.x + sx * box.hx * 0.92, box.y + STAND.h + sy * box.hy, box.z + sz * box.hz * 0.92))
      best = Math.min(best, off(this.rect(points), x, y))
    }
    // The front of its stand, with the key that can be anywhere round it.
    best = Math.min(best, off(this.rect([{ x: pose.x - STAND.r * 0.85, y: pose.y + STAND.h, z: pose.z }, { x: pose.x + STAND.r * 0.85, y: pose.y, z: pose.z + STAND.r * 0.95 }]), x, y))
    if (id === 'giraffe') {
      // Its neck.
      const a = this.px({ x: pose.x, y: pose.y + 1.8, z: pose.z }), b = this.px(inRoom(pose, turn, 0, headOf(id), 0.3))
      best = Math.min(best, off({ x0: Math.min(a.x, b.x) - 14, x1: Math.max(a.x, b.x) + 14, y0: b.y, y1: a.y }, x, y))
    }
    return best
  }

  at(game: Game, x: number, y: number): Target {
    // Nearest to the child first: what is seen in front is what is touched.
    const near = [...CAST].sort((a, b) => game.poses[b].z - game.poses[a].z || CAST.indexOf(a) - CAST.indexOf(b))
    // A shown picture stands before whoever waits behind it.
    const size = game.easel.size, shown = game.easel.tile >= 0 && off(this.flat(game.easel, (PICTURE.w + 0.4) * size, (PICTURE.h + 0.4) * size), x, y) <= 2
    for (const id of near) if ((!shown || game.poses[id].z > game.easel.z) && this.outside(game, id, x, y) <= 0) return { kind: 'sitter', id }
    if (shown) return { kind: 'small', what: 'shown' }
    if (game.keyUp > 0.5) {
      const k = this.px({ x: KEY.x, y: KEY.y + 0.6, z: KEY.z })
      if (Math.hypot(x - k.x, y - k.y) < Math.max(34, this.height * 0.05)) return { kind: 'small', what: 'key' }
    }
    let close: Id | null = null, least = PAD
    for (const id of near) {
      const d = this.outside(game, id, x, y)
      if (d < least) { least = d; close = id }
    }
    const hit = (r: Rect): boolean => off(r, x, y) <= 4
    if (close) return { kind: 'sitter', id: close }
    if (hit(this.rect([{ x: MAESTRO.x - 1.4, y: 1.2, z: MAESTRO.z }, { x: MAESTRO.x + 1.35, y: 5.6, z: MAESTRO.z }]))) return { kind: 'small', what: 'maestro' }
    if (hit(this.rect([{ x: EASEL.x - 1.25, y: 1.5, z: EASEL.z }, { x: EASEL.x + 1.2, y: EASEL.y + 1.2, z: EASEL.z }]))) return { kind: 'small', what: 'easel' }
    for (let n = 0; n < NAILS.length; n++) if (game.nails[n].hung && hit(this.flat(NAILS[n], PICTURE.w * HUNG + 0.3, PICTURE.h * HUNG + 0.3))) return { kind: 'nail', n }
    if (hit(this.rect([{ x: 1.75, y: 0.5, z: -5.4 }, { x: 3.2, y: 2.3, z: -5.4 }]))) return { kind: 'small', what: 'pots' }
    const t = this.px({ x: 0, y: -0.2, z: 0.6 }), rx = this.px({ x: 3, y: 0, z: 0 }).x - this.px({ x: 0, y: 0, z: 0 }).x
    if (((x - t.x) / rx) ** 2 + ((y - t.y) / (rx * 0.62)) ** 2 < 1) return { kind: 'small', what: 'table' }
    for (const step of STEPS) if (hit(this.rect([{ x: step.x - 1.3, y: step.y - 0.7, z: step.z + 1.3 }, { x: step.x + 1.3, y: step.y, z: step.z - 1.3 }]))) return { kind: 'small', what: 'step' }
    if (hit(this.rect([{ x: -4.2, y: 2.6, z: -7.9 }, { x: -0.6, y: 7.4, z: -7.9 }]))) return { kind: 'small', what: 'window' }
    if (y > this.px({ x: 0, y: -1.5, z: -7.9 }).y) return { kind: 'small', what: 'floor' }
    return { kind: 'air' }
  }

  /** Where a thing held at a point would go: the place under it, taken or not, or else the nearest one that is free. */
  placeUnder(game: Game, x: number, y: number): Place {
    const places: Place[] = [...SPOTS.map((_, n): Place => ({ kind: 'spot', n })), ...STEPS.map((_, n): Place => ({ kind: 'step', n }))]
    const own = game.hand ? placeOf(game.table, game.hand.id) : null
    let best: Place | null = null, least = this.height * 0.1, free: Place | null = null, freeLeast = Infinity
    for (const place of places) {
      const p = game.where(place), s = this.px({ x: p.x, y: p.y + 0.75, z: p.z }), d = Math.hypot(x - s.x, y - s.y)
      if (d < least) { least = d; best = place }
      const isOwn = own !== null && own.kind === place.kind && own.n === place.n
      if ((game.at(place) === null || isOwn) && d < freeLeast) { freeLeast = d; free = place }
    }
    return best ?? free!
  }
}

const off = (r: Rect, x: number, y: number): number => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.y0 - y, 0, y - r.y1))
