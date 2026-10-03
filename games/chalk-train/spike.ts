import { CHALKS, chalkLine, dust, makeGrain, roughen } from './chalk'
import { drawEngine, drawPuff, drawStop, drawWagon } from './figures'
import { pathLength, resample, spotAt } from './path'
import { HOME_FIGURES, RIDER_FIGURES } from './riderFigures'
import { makeRng, type Rng } from './rng'
import { paintTar, viewFor } from './tar'
import { PLACES, type Pt } from './yard'

// The look spike: the game's real scene in chalk on tar, painted once from a
// fixed seed, with nothing playable behind it. The toy replaces this file.

type G = CanvasRenderingContext2D
export const SPIKE_SEED = 20261003
const [WHITE, YELLOW, PINK] = CHALKS
/** How much bigger than its drawing each kind of figure stands on the tar: big enough for a two-year-old to aim at. */
const TRAIN = 1.4, RIDER = 1.5, HOME = 1.3, STOP = 1.15
/** A rider's feet are this far below the middle of its place. */
const FOOT = 58

/** The line a child might have drawn: off from the stop, round a loop, and not quite to the pond. */
const CHILD_LINE: Pt[] = [
  { x: 226, y: 462 }, { x: 300, y: 454 }, { x: 372, y: 460 }, { x: 446, y: 448 }, { x: 520, y: 454 }, { x: 600, y: 446 },
  { x: 690, y: 426 }, { x: 772, y: 376 }, { x: 800, y: 296 }, { x: 760, y: 222 }, { x: 684, y: 198 }, { x: 612, y: 230 },
  { x: 580, y: 302 }, { x: 606, y: 374 }, { x: 672, y: 430 }, { x: 756, y: 452 }, { x: 836, y: 442 }, { x: 900, y: 448 },
]
const OLD_ZIGZAG: Pt[] = [{ x: 60, y: 736 }, { x: 118, y: 682 }, { x: 166, y: 742 }, { x: 226, y: 688 }, { x: 276, y: 746 }, { x: 336, y: 694 }, { x: 380, y: 738 }]

/** A mark as the game lays it: the rail, and a sleeper every so often across it. */
function rail(g: G, rng: Rng, pts: Pt[], colour: string) {
  const even = resample(pts, 12), total = pathLength(even)
  for (let s = 18; s < total - 8; s += 34) {
    const at = spotAt(even, s)
    chalkLine(g, rng, [{ x: at.x + at.ty * 17, y: at.y - at.tx * 17 }, { x: at.x - at.ty * 17, y: at.y + at.tx * 17 }], WHITE, 4)
  }
  chalkLine(g, rng, even, colour, 12)
}

function placed(g: G, x: number, y: number, angle: number, size: number, mirror: boolean, draw: () => void) {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  g.scale(mirror ? -size : size, size)
  draw()
  g.restore()
}

function paintChalk(g: G, rng: Rng) {
  // Older marks, paler the older they are.
  g.globalAlpha = 0.5
  rail(g, rng, OLD_ZIGZAG, PINK)
  g.globalAlpha = 1
  chalkLine(g, rng, [{ x: 880, y: 690 }], YELLOW, 15)
  dust(g, rng, 880, 690, 30, YELLOW)

  // The stop the frog left, with the engine's stub of rail, and the frog's pond ahead.
  const west = PLACES['mid-1'], east = PLACES['mid-4']
  placed(g, west.x - 10, west.y + FOOT, 0, STOP, false, () => drawStop(g, rng))
  rail(g, rng, [{ x: 86, y: 470 }, { x: 156, y: 466 }, { x: 226, y: 462 }], WHITE)
  placed(g, east.x - 6, east.y + FOOT + 8, 0, HOME, false, () => HOME_FIGURES.frog(g, rng))

  // The next rider, waiting at its stop and looking at its nest across the tar.
  const stop = PLACES['top-4'], nest = PLACES['top-1']
  placed(g, stop.x + 30, stop.y + FOOT, 0, STOP, true, () => drawStop(g, rng))
  placed(g, stop.x - 6, stop.y + FOOT - 12, 0, RIDER, true, () => RIDER_FIGURES.chick(g, rng, { x: 0.7, y: 0.1 }))
  placed(g, nest.x, nest.y + FOOT, 0, HOME, false, () => HOME_FIGURES.chick(g, rng))

  // The child's line, and the train on it just past the loop.
  rail(g, rng, CHILD_LINE, WHITE)
  dust(g, rng, 900, 448, 22, WHITE, 10)
  const even = resample(CHILD_LINE, 12)
  const engineAt = spotAt(even, 262), wagonAt = spotAt(even, 262 - 150 * TRAIN)
  const lift = 9
  placed(g, wagonAt.x, wagonAt.y - lift, Math.atan2(wagonAt.ty, wagonAt.tx), TRAIN, false, () =>
    drawWagon(g, rng, YELLOW, 1.1, () => placed(g, 0, -40, 0, 0.92, false, () => RIDER_FIGURES.frog(g, rng, { x: 0.8, y: -0.1 }))))
  placed(g, engineAt.x, engineAt.y - lift, Math.atan2(engineAt.ty, engineAt.tx), TRAIN, false, () => drawEngine(g, rng, { look: { x: 0.8, y: 0.1 }, spin: 0.7 }))
  const funnel = { x: engineAt.x + 32 * TRAIN, y: engineAt.y - 116 * TRAIN }
  placed(g, funnel.x - 18, funnel.y - 22, 0, TRAIN, false, () => drawPuff(g, rng, 0, 0, 0))
  placed(g, funnel.x - 84, funnel.y - 56, 0, TRAIN, false, () => drawPuff(g, rng, 0, 0, 0.4))
  placed(g, funnel.x - 176, funnel.y - 74, 0, TRAIN, false, () => drawPuff(g, rng, 0, 0, 0.8))
}

/** Paints the scene once for a surface size and keeps it; `draw` then only copies it. */
export class LookSpike {
  private kept: HTMLCanvasElement | null = null
  private key = ''

  draw(canvas: HTMLCanvasElement, width: number, height: number, dpr: number) {
    const g = canvas.getContext('2d')
    if (!g || width <= 0 || height <= 0) return
    const key = `${width}x${height}@${dpr}`
    if (key !== this.key || !this.kept) {
      this.key = key
      this.kept = this.paint(width, height, dpr)
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(this.kept, 0, 0)
  }

  private paint(width: number, height: number, dpr: number): HTMLCanvasElement {
    const view = viewFor(width, height)
    const ground = document.createElement('canvas')
    ground.width = Math.round(width * dpr)
    ground.height = Math.round(height * dpr)
    const tar = ground.getContext('2d')!
    tar.scale(dpr, dpr)
    paintTar(tar, width, height, view, SPIKE_SEED)

    const layer = document.createElement('canvas')
    layer.width = ground.width
    layer.height = ground.height
    const chalk = layer.getContext('2d')!
    chalk.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.dx, dpr * view.dy)
    const rng = makeRng(SPIKE_SEED + 1)
    paintChalk(chalk, rng)
    chalk.setTransform(1, 0, 0, 1, 0, 0)
    roughen(chalk, makeGrain(makeRng(SPIKE_SEED + 2)), layer.width, layer.height, dpr)

    tar.setTransform(1, 0, 0, 1, 0, 0)
    tar.drawImage(layer, 0, 0)
    return ground
  }
}
