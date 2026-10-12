import { fromRows, type Plaque } from './beads'
import { eyeKeys, flattened, type Eye, type Figure } from './figures'
import type { Pose } from './pose'

// Where every plaque of a figure is, for a pose: the one place that turns a
// pose into things with a place and a size. The view draws exactly these
// quads and a finger is read against exactly these, so a thing is touched
// where it is drawn, and a test can hold both without a renderer.
//
// A quad is one plaque as a flat rectangle. An upright quad stands in a plane
// that faces the child: its middle is at `x`, `y`, `z` (pegs right of the
// figure's origin, above the board, towards the child) and its two sides are
// the vectors `ax, ay` (along the plaque's rows) and `bx, by` (up its
// columns). A flat quad lies on the board `y` above it: it is `ax` wide and
// `by` long, with its top row away from the child.

export type Quad = { tile: Plaque; x: number; y: number; z: number; ax: number; ay: number; bx: number; by: number; flat: boolean }

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number; front: number }

/** How far in front of its plaque an eye lies: less than the least gap between two layers. */
export const EYE_LIFT = 0.2

const metrics = new WeakMap<Figure, { half: number; tall: number }>()

/** Half a figure's width and its height at rest, in pegs. */
export function sizeOf(figure: Figure): { half: number; tall: number } {
  let size = metrics.get(figure)
  if (!size) {
    const sheet = flattened(figure)
    size = { half: sheet.w / 2, tall: sheet.h }
    metrics.set(figure, size)
  }
  return size
}

const eyeTiles = new Map<string, Plaque>()

/** The four pegs of an eye as a small plaque of their own, laid over the eye in the face. */
export function eyeTile(eye: Eye, lookX: number, lookY: number, shut: boolean): Plaque {
  const keys = eyeKeys(eye, lookX, lookY, shut)
  const name = keys.join('')
  let tile = eyeTiles.get(name)
  if (!tile) {
    tile = fromRows([keys[0] + keys[1], keys[2] + keys[3]])
    eyeTiles.set(name, tile)
  }
  return tile
}

/** Every plaque an eye can be laid over with: the tiles the view paints before the first frame. */
export function eyeTilesOf(eye: Eye): Plaque[] {
  const tiles = [eyeTile(eye, 0, 0, true)]
  for (const lookX of [-1, 1]) for (const lookY of [0, 1]) tiles.push(eyeTile(eye, lookX, lookY, false))
  return tiles
}

function quadAt(out: Quad[], n: number): Quad {
  let quad = out[n]
  if (!quad) {
    quad = { tile: null as unknown as Plaque, x: 0, y: 0, z: 0, ax: 0, ay: 0, bx: 0, by: 0, flat: false }
    out[n] = quad
  }
  return quad
}

/**
 * Lays a figure out for a pose, in the figure's own pegs, into `out` from index `from`. Returns the index after
 * the last quad written. A figure stands on the board: where a turn would put a corner under it, the whole
 * figure is carried up by that much, as a thing that tumbles on a floor is. `bounds`, when given, takes the
 * box of everything upright.
 */
export function place(figure: Figure, pose: Pose, out: Quad[], from = 0, bounds?: Bounds): number {
  const { tall } = sizeOf(figure)
  const turned = Math.cos(pose.spin)
  const fx = (pose.flip ? -1 : 1) * turned
  const zs = turned < 0 ? -1 : 1
  const ct = Math.cos(pose.tilt), st = Math.sin(pose.tilt)
  const mid = tall / 2
  // The figure's own change, after its joints: it wheels about its middle, gives from its feet, and turns like a card.
  const lx = (x: number, y: number): number => fx * pose.sx * (ct * x - st * y)
  const ly = (x: number, y: number): number => pose.sy * (st * x + ct * y)
  let n = from, lowest = 0
  const first = n
  for (const part of figure.parts) {
    const at = pose.parts[part.name]
    if (!at.show) continue
    const w = part.plaque.w, h = part.plaque.h
    if (part.flat) {
      const quad = quadAt(out, n++)
      quad.tile = part.plaque
      quad.flat = true
      quad.x = pose.x + part.at[0] + at.dx + w / 2 - part.pivot[0]
      quad.y = part.at[1]
      quad.z = part.at[2] + h / 2 - part.pivot[1]
      quad.ax = w
      quad.ay = 0
      quad.bx = 0
      quad.by = h
      continue
    }
    const turn = (part.turn ?? 0) + at.turn
    const c = Math.cos(turn), s = Math.sin(turn)
    const jx = part.at[0] + at.dx, jy = part.at[1] + at.dy
    const lay = (px: number, py: number, wide: number, high: number, tile: Plaque, z: number): void => {
      // `px`, `py`: the middle of the piece, in the plaque's own pegs from its top left.
      const ox = px - part.pivot[0], oy = part.pivot[1] - py
      const cx = jx + c * ox - s * oy, cy = jy + s * ox + c * oy - mid
      const quad = quadAt(out, n++)
      quad.tile = tile
      quad.flat = false
      quad.x = pose.x + lx(cx, cy)
      quad.y = pose.y + ly(cx, cy) + mid * pose.sy
      quad.z = z
      quad.ax = lx(c * wide, s * wide)
      quad.ay = ly(c * wide, s * wide)
      quad.bx = lx(-s * high, c * high)
      quad.by = ly(-s * high, c * high)
      const reachY = (Math.abs(quad.ay) + Math.abs(quad.by)) / 2
      lowest = Math.min(lowest, quad.y - reachY)
    }
    lay(w / 2, h / 2, w, h, part.plaque, part.at[2] * zs)
    if (part.eyes && zs > 0) {
      part.eyes.forEach((eye, i) => {
        // With nowhere to look, the two eyes look at each other a little.
        const lookX = pose.lookX !== 0 ? pose.lookX : i === 0 ? 1 : -1
        lay(eye.x + 1, eye.y + 1, 2, 2, eyeTile(eye, lookX, pose.lookY, pose.shut), part.at[2] + EYE_LIFT)
      })
    }
  }
  if (bounds) {
    bounds.minX = bounds.minY = Infinity
    bounds.maxX = bounds.maxY = bounds.front = -Infinity
  }
  for (let i = first; i < n; i++) {
    const quad = out[i]
    if (quad.flat) continue
    quad.y -= lowest
    if (!bounds) continue
    const reachX = (Math.abs(quad.ax) + Math.abs(quad.bx)) / 2, reachY = (Math.abs(quad.ay) + Math.abs(quad.by)) / 2
    bounds.minX = Math.min(bounds.minX, quad.x - reachX)
    bounds.maxX = Math.max(bounds.maxX, quad.x + reachX)
    bounds.minY = Math.min(bounds.minY, quad.y - reachY)
    bounds.maxY = Math.max(bounds.maxY, quad.y + reachY)
    bounds.front = Math.max(bounds.front, quad.z)
  }
  return n
}
