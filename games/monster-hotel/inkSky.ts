import type { Phase } from './guests'
import { INK, PAPER, mulberry32 } from './inkHatch'
import type { PageLayout, Rect } from './layout'

// What lives in the sky over the lobby, where the page has most paper and, on
// a first visit, no monster in any room: three crows in the bare tree, and
// the smoke of the hotel's chimney. The crows shuffle on their boughs, turn
// about, and one after another take a turn round the sky; touched, all three
// go up at once and come back. By night they sleep, heads sunk. Everything
// here is pure arithmetic over the layout and the seconds handed in, so the
// same moment always looks the same; the drawing is flat ink, as a crow
// against the sky is, and the smoke is bare paper with a line round it. No
// crow is drawn as two strokes that meet: a bird like that reads as a letter.

/** One bough of the tree: from where it leaves its parent, through its bend, to its end. */
export type Bough = { x: number; y: number; mx: number; my: number; ex: number; ey: number; weight: number; depth: number }

const TREES = new WeakMap<PageLayout, Bough[]>()

/**
 * The bare tree behind the lobby, bough by bough from the trunk outward, in
 * the order the building's layer draws them. One seeded run of numbers gives
 * every bend and fork, so the layer that draws the tree and the crows that
 * sit in it agree on where its boughs are.
 */
export function treeOf(page: PageLayout): Bough[] {
  const known = TREES.get(page)
  if (known) return known
  const u = page.scale, plate = page.plate, next = mulberry32(2203), boughs: Bough[] = []
  const branch = (x: number, y: number, angle: number, length: number, weight: number, depth: number): void => {
    const bend = (next() - 0.5) * 0.5
    const mx = x + Math.cos(angle + bend) * length * 0.5, my = y + Math.sin(angle + bend) * length * 0.5
    const ex = mx + Math.cos(angle - bend) * length * 0.5, ey = my + Math.sin(angle - bend) * length * 0.5
    boughs.push({ x, y, mx, my, ex, ey, weight, depth })
    if (depth <= 0) return
    const forks = depth > 3 ? 2 : next() < 0.7 ? 2 : 3
    for (let i = 0; i < forks; i++) {
      const turn = angle + (i - (forks - 1) / 2) * (0.75 + next() * 0.3) + (next() - 0.5) * 0.3
      const shorter = length * (0.62 + next() * 0.16)
      branch(ex, ey, turn, shorter, Math.max(0.7 * u, weight * 0.62), depth - 1)
    }
  }
  branch(page.lobby.x + page.lobby.w * 0.64, page.canopy.y + page.canopy.h, -Math.PI / 2 - 0.08, Math.min(92 * u, (page.canopy.y - plate.y) * 0.36), 7 * u, 5)
  TREES.set(page, boughs)
  return boughs
}

/** How many crows live in the tree. */
export const CROWS = 3

/** Where each crow sits: the ends of three stout boughs, the highest, the furthest left and the furthest right, each well clear of the others. */
export function perchesOf(page: PageLayout): { x: number; y: number }[] {
  const stout = treeOf(page).filter((bough) => bough.depth === 2 || bough.depth === 3).map((bough) => ({ x: bough.ex, y: bough.ey }))
  const clear = (point: { x: number; y: number }, chosen: { x: number; y: number }[]) => chosen.every((other) => Math.hypot(other.x - point.x, other.y - point.y) > 34 * page.scale)
  const chosen: { x: number; y: number }[] = []
  for (const order of [(a: { x: number; y: number }, b: { x: number; y: number }) => a.y - b.y, (a: { x: number; y: number }, b: { x: number; y: number }) => a.x - b.x, (a: { x: number; y: number }, b: { x: number; y: number }) => b.x - a.x]) {
    const pick = [...stout].sort(order).find((point) => clear(point, chosen))
    if (pick) chosen.push(pick)
  }
  return chosen
}

/** The tree, trunk and boughs, without its outermost twigs: where a finger sets the crows flying. The sky to either side of it stays bare paper. */
export function treeBox(page: PageLayout): Rect {
  const boughs = treeOf(page).filter((bough) => bough.depth >= 1), u = page.scale
  const xs = boughs.flatMap((bough) => [bough.x, bough.ex]), ys = boughs.flatMap((bough) => [bough.y, bough.ey])
  const left = Math.min(...xs) - 4 * u, top = Math.max(page.plate.y, Math.min(...ys) - 4 * u)
  return { x: left, y: top, w: Math.max(...xs) + 4 * u - left, h: Math.max(...ys) - top }
}

/** How long a crow's turn round the sky lasts, in seconds. */
export const FLIGHT_SECONDS = 3.6

/** Each crow's own round: how often it goes up by itself by day, and when in that round. No two rounds are alike, so they are seldom up together. */
const ROUNDS = [{ every: 13, at: 4 }, { every: 19, at: 11 }, { every: 29, at: 21 }] as const

export type Crow = {
  x: number
  y: number
  /** 1 facing right, -1 facing left. */
  faces: 1 | -1
  /** In the air: how far through its turn round the sky, 0 to 1. Null on its bough. */
  aloft: number | null
  /** Asleep on its bough, head sunk into its feathers. */
  asleep: boolean
}

const hash = (a: number, b: number): number => mulberry32((a * 7919 + b * 104729) >>> 0)()

/**
 * The crows at one moment. `startled` is how many seconds ago a finger set
 * them flying, or null. By day each also takes a turn by itself now and
 * then; by night they sleep unless startled.
 */
export function crowsAt(page: PageLayout, phase: Phase, seconds: number, startled: number | null = null): Crow[] {
  const u = page.scale, plate = page.plate
  return perchesOf(page).map((perch, index) => {
    const round = ROUNDS[index % ROUNDS.length]!
    // Startled, they go up one a blink after another.
    const since = startled === null ? -1 : startled - index * 0.14
    const own = phase === 'day' ? (seconds + round.at) % round.every : Infinity
    const aloft = since >= 0 && since < FLIGHT_SECONDS ? since / FLIGHT_SECONDS : own < FLIGHT_SECONDS ? own / FLIGHT_SECONDS : null
    if (aloft === null) {
      if (phase === 'night') return { x: perch.x, y: perch.y, faces: index % 2 ? 1 : -1, aloft: null, asleep: true }
      // On its bough it turns about every few seconds and gives a small hop now and then.
      const turn = Math.floor((seconds + index * 1.7) / (4 + index))
      const hop = (seconds * (0.21 + index * 0.05) + index * 0.37) % 1
      return { x: perch.x, y: perch.y - (hop < 0.08 ? Math.sin((hop / 0.08) * Math.PI) * 2.2 * u : 0), faces: hash(turn, index) < 0.5 ? -1 : 1, aloft: null, asleep: false }
    }
    // A loop that leaves the bough upward and to one side, swings out over the sky and comes back down onto it.
    const way = index % 2 ? 1 : -1, wide = (120 + index * 34) * u, high = (40 + index * 16) * u
    const turn = aloft * Math.PI * 2
    const x = perch.x + way * (wide / 2) * (1 - Math.cos(turn))
    const y = perch.y - high * Math.sin(aloft * Math.PI) ** 2 - high * 0.4 * Math.sin(turn)
    return {
      x: Math.max(plate.x + 14 * u, Math.min(plate.x + plate.w - 14 * u, x)),
      y: Math.max(plate.y + 12 * u, y),
      faces: (way * Math.sin(turn) >= 0 ? 1 : -1) as 1 | -1,
      aloft,
      asleep: false,
    }
  })
}

/** Adds a closed shape through the points to the path, always wound the way the canvas winds a circle: a mirrored crow's parts would otherwise be wound backwards and cut holes where they lie over its body. */
function poly(ctx: CanvasRenderingContext2D, points: readonly number[]): void {
  const n = points.length / 2
  let twice = 0
  for (let i = 0; i < n; i++) twice += points[i * 2]! * points[((i + 1) % n) * 2 + 1]! - points[((i + 1) % n) * 2]! * points[i * 2 + 1]!
  const order = twice >= 0 ? (i: number) => i : (i: number) => n - 1 - i
  ctx.moveTo(points[order(0) * 2]!, points[order(0) * 2 + 1]!)
  for (let i = 1; i < n; i++) ctx.lineTo(points[order(i) * 2]!, points[order(i) * 2 + 1]!)
  ctx.closePath()
}

/** The crows, in flat ink: one fill. Returns how many fills it made. */
export function drawCrows(ctx: CanvasRenderingContext2D, page: PageLayout, phase: Phase, seconds: number, startled: number | null = null): number {
  const s = page.scale * 1.15
  ctx.beginPath()
  for (const crow of crowsAt(page, phase, seconds, startled)) {
    const { x, y, faces: f } = crow
    if (crow.aloft !== null) {
      // In the air, side on: a long body, a head and a beak ahead of it, a tail behind, and one wing that beats up and down.
      const beat = Math.sin(seconds * 17 + x * 0.01)
      ctx.moveTo(x + 8 * s, y)
      ctx.ellipse(x, y, 8 * s, 3.3 * s, 0, 0, Math.PI * 2)
      ctx.moveTo(x + f * 8.5 * s + 2.9 * s, y - 1.6 * s)
      ctx.arc(x + f * 8.5 * s, y - 1.6 * s, 2.9 * s, 0, Math.PI * 2)
      poly(ctx, [x + f * 10.5 * s, y - 2.8 * s, x + f * 15.5 * s, y - 1 * s, x + f * 10.5 * s, y - 0.2 * s])
      poly(ctx, [x - f * 6 * s, y - 2 * s, x - f * 16 * s, y - 2.6 * s, x - f * 15 * s, y + 2.6 * s, x - f * 6 * s, y + 2 * s])
      poly(ctx, [x + f * 5.5 * s, y - 0.5 * s, x - f * 6 * s, y - 0.5 * s, x - f * 7 * s, y - (0.5 + 16 * beat) * s, x - f * 1 * s, y - (0.5 + 12 * beat) * s])
      continue
    }
    // On its bough: a plump body leaning forward, a tail down behind, and a head with a beak, or the head sunk in for the night.
    ctx.moveTo(x + 7.5 * s, y - 6 * s)
    ctx.ellipse(x, y - 6 * s, 7.5 * s, 5.4 * s, -0.35 * f, 0, Math.PI * 2)
    poly(ctx, [x - f * 4.5 * s, y - 7.5 * s, x - f * 14.5 * s, y + 1.5 * s, x - f * 10.5 * s, y + 2.5 * s, x - f * 3 * s, y - 2 * s])
    poly(ctx, [x - 2.2 * s, y - 2 * s, x - 1 * s, y + 1.6 * s, x + 0.4 * s, y + 1.6 * s, x + 0.2 * s, y - 2 * s])
    poly(ctx, [x + 1.2 * s, y - 2 * s, x + 2 * s, y + 1.6 * s, x + 3.4 * s, y + 1.6 * s, x + 3.2 * s, y - 2 * s])
    if (crow.asleep) {
      ctx.moveTo(x + f * 2.5 * s + 3.6 * s, y - 9.5 * s)
      ctx.arc(x + f * 2.5 * s, y - 9.5 * s, 3.6 * s, 0, Math.PI * 2)
      continue
    }
    ctx.moveTo(x + f * 5.5 * s + 3.5 * s, y - 11.5 * s)
    ctx.arc(x + f * 5.5 * s, y - 11.5 * s, 3.5 * s, 0, Math.PI * 2)
    poly(ctx, [x + f * 8 * s, y - 13 * s, x + f * 13.5 * s, y - 10.6 * s, x + f * 8 * s, y - 9.6 * s])
  }
  ctx.fillStyle = INK
  ctx.fill()
  return 1
}

/** The smoke of the chimney: four puffs of bare paper, each with a line round it, that leave the pot one after another, swell, trail off with the air and thin away. Returns how many fills and strokes it made. */
export function drawSmoke(ctx: CanvasRenderingContext2D, page: PageLayout, seconds: number): number {
  const u = page.scale, pot = { x: page.chimney.x + page.chimney.w - 10.5 * u, y: page.chimney.y - 14 * u }
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const t = (seconds * 0.16 + i / 4) % 1, r = (3 + t * 9) * u * Math.min(1, (1 - t) * 3.2)
    if (r < 0.6 * u) continue
    // The chimney stands close under the top of the page, so the smoke rises a little and trails away along the ridge with the air.
    const x = pot.x + (t * 64 + Math.sin(t * 6 + i * 2.1) * 3) * u, y = Math.max(page.plate.y + r + 3 * u, pot.y - (2 + Math.sqrt(t) * 15) * u)
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.1 * u
  ctx.stroke()
  return 2
}
