import { chief, chiefModel, postVan, roll, tray } from './figures'
import { settle, solve } from './frame'
import { pin, stream, string, wood, type Pen } from './look'
import { STILL } from './motion'
import { key, pinsOf, type Part } from './kit'
import { paintSheet, plotFor, px } from './sheet'
import { COLS, isFooting, site } from './sites'

// The look spike: the game's real scene in its first reserved look, Blueprint
// and balsa, drawn once from a fixed seed with nothing playable behind it. The
// sheet is the free yard with a bridge that uses all four kinds of part, the
// van waiting at the near bank, the crew chief in the margin, the tray of
// parts under the gap and the next sheet rolled up at the right edge. The
// bridge lies where the frame model says it rests under its own weight.

const SEED = 20261003

/** The dip is drawn larger than computed, by this one factor for every part and every bridge (ART.md, "Where it is not science"). */
export const DRAWN_DIP = 6

export const SPIKE_SITE = site('open-yard', 0)

const part = (kind: Part['kind'], ax: number, ay: number, bx: number, by: number, turned = false): Part => ({ kind, a: [ax, ay], b: [bx, by], turned })

export const SPIKE_BRIDGE: readonly Part[] = [
  part('plank', 6, 6, 10, 6, true), part('plank', 10, 6, 14, 6, true), part('plank', 14, 6, 18, 6, true),
  part('tube', 10, 3, 10, 6),
  part('stick', 14, 6, 14, 4), part('stick', 14, 4, 12, 6), part('stick', 14, 4, 16, 6),
  part('thread', 19, 11, 14, 6), part('thread', 5, 11, 10, 6),
]

/** How many parts and figures the spike draws: what a canvas game reports as its draw calls. */
export function drawSpike(pen: Pen, width: number, height: number, ratio: number): number {
  pen.setTransform(ratio, 0, 0, ratio, 0, 0)
  const plot = plotFor(width, height), { cell } = plot, at = SPIKE_SITE, random = stream(SEED)
  paintSheet(pen, width, height, plot, at, SEED)

  const footing = isFooting(at), frame = settle(SPIKE_BRIDGE, footing), rest = solve(frame)
  /** Where a grid point of the bridge lies now, in pixels: where it was built, plus the model's displacement drawn larger. */
  const now = (x: number, y: number): [number, number] => {
    const node = frame.at.get(key([x, y]))
    const [dx, dy] = node === undefined ? [0, 0] : rest.moved(node)
    return px(plot, x + dx * DRAWN_DIP, y + dy * DRAWN_DIP)
  }
  let drawn = 0
  // Threads lie under the wood, wood under the pins.
  for (const piece of SPIKE_BRIDGE) if (piece.kind === 'thread') { string(pen, ...now(...piece.a), ...now(...piece.b), cell); drawn++ }
  for (const piece of SPIKE_BRIDGE) {
    if (piece.kind === 'thread') continue
    wood(pen, piece.kind === 'plank' ? (piece.turned ? 'plank-edge' : 'plank') : piece.kind, ...now(...piece.a), ...now(...piece.b), cell, random)
    drawn++
  }
  const pins = new Map<string, readonly [number, number]>()
  for (const piece of SPIKE_BRIDGE) for (const point of piece.kind === 'plank' ? [piece.a, piece.b] : pinsOf(piece)) pins.set(key(point), point)
  for (const point of pins.values()) { pin(pen, ...now(point[0], point[1]), cell, footing(point)); drawn++ }

  // The want of the scene: the van at the near bank, facing the gap.
  postVan(pen, ...px(plot, at.left[0] - 0.8, at.left[1]), cell, random)
  const [chiefX, chiefY] = px(plot, 0.9, at.left[1])
  chief(pen, chiefX, chiefY, cell * 1.35, STILL, random)
  chiefModel(pen, chiefX + cell * 1.35, chiefY, cell * 1.35, random)
  tray(pen, ...px(plot, at.left[0] - 1, -1.25), (at.right[0] - at.left[0] + 2) * cell, cell, at.kit, random)
  roll(pen, ...px(plot, COLS - 0.1, at.right[1]), cell * 3.1, cell)
  return drawn + 4
}
