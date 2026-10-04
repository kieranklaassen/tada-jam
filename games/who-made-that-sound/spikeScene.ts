import { AT_REST, GROWN, LITTLE, WIDE, type Pose } from './figures'
import { PEEK, Paper } from './paper'
import { ASKER, BASKET, EDGE_PEEK, FLOOR, GROUND, HILL_SPOTS, STAGE, eggSpots } from './stage'
import type { Sprite } from './tissue'
import { KINDS, type Kind } from './voices'

export { PAPER } from './paper'

// The look spike: the game's real scene at the place `three-eggs`, as a still
// that sways a little, in painted-tissue collage. Nothing here can be played.
// It is here to be looked at before any rule is built on it, and the stages
// after it take the page, the pieces and the figures from it.
//
// The toy has replaced it at load; `spike=1` in the address still shows it.
// The page and the pieces are painted and cut in paper.ts.

/** The spike paints the same page every time. */
export const SPIKE_SEED = 0x7155e5

/** `kinds=1` in the address lays the six kinds out side by side instead of the scene, to judge their outlines together. */
export function wantsKinds(search: string): boolean {
  return new URLSearchParams(search).get('kinds') === '1'
}

/** `spike=1` in the address shows the look spike in place of the toy; so does `kinds=1`. */
export function wantsSpike(search: string): boolean {
  return new URLSearchParams(search).get('spike') === '1' || wantsKinds(search)
}

/** The six grown kinds in a row across the page, with the same clear page between each two: where each stands and how tall. */
export function kindsRow(shrink = 0.9): { kind: Kind; x: number; size: number }[] {
  const widths = KINDS.map((kind) => GROWN[kind] * WIDE[kind] * shrink)
  const between = (STAGE.width - widths.reduce((sum, width) => sum + width, 0)) / (KINDS.length + 1)
  let left = between
  return KINDS.map((kind, i) => {
    const x = left + widths[i] / 2
    left += widths[i] + between
    return { kind, x, size: GROWN[kind] * shrink }
  })
}

const SHUT_S = 0.16
/**
 * A blink now and then: 0 with the eyes open, up to 1 and back within `SHUT_S`, once every `every` seconds.
 * `into` is how far into its wait a pair of eyes starts, so that no two blink together; while it is under
 * `every - SHUT_S` the eyes are open at 0 seconds, and the first frame is a plain still.
 */
export function blink(seconds: number, every: number, start = 0): number {
  const into = (seconds + start) % every
  return into > every - SHUT_S ? Math.sin(((into - (every - SHUT_S)) / SHUT_S) * Math.PI) : 0
}

export class SpikeScene {
  private ctx: CanvasRenderingContext2D
  private paper: Paper
  private kinds: boolean
  private count = 0

  constructor(canvas: HTMLCanvasElement, search: string, seed = SPIKE_SEED) {
    this.ctx = canvas.getContext('2d')!
    this.kinds = wantsKinds(search)
    this.paper = new Paper(canvas, seed, { hill: !this.kinds, stone: !this.kinds })
  }

  private put(sprite: Sprite, x: number, y: number, squash = 1) {
    this.paper.put(this.ctx, sprite, x, y, { sy: squash })
    this.count++
  }

  private figure(kind: Kind, x: number, y: number, size: number, pose: Partial<Pose>) {
    this.count += this.paper.figures.draw(this.ctx, kind, x, y, size, { ...AT_REST, ...pose })
  }

  /**
   * Draws the frame for `seconds` on the attended clock and returns how many
   * sprites that took. `width` and `height` are the surface in CSS pixels;
   * the canvas has been sized by the Mount.
   */
  draw(width: number, height: number, dpr: number, seconds: number): number {
    if (width <= 0 || height <= 0) return 0
    this.paper.fit(width, height, dpr)
    const { ctx } = this, { view } = this.paper, props = this.paper.props!, sway = (rate: number, late = 0) => Math.sin(seconds * rate + late)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.paper.layer, 0, 0)
    this.count = 1
    if (this.kinds) {
      kindsRow().forEach(({ kind, x, size }, i) => {
        this.figure(kind, x, GROUND.top + 12, size, { blink: blink(seconds, 4 + i * 0.7, i) })
        this.figure(kind, x, FLOOR, size * LITTLE, { wings: 1, reach: i % 3 === 0 ? 0 : 1, turn: i % 2 ? 1 : -1 })
      })
    } else {
      // On the hill: a pip with its little one on its head, and a little dooo by itself.
      const [, family, alone] = HILL_SPOTS, pipX = family.x + family.w / 2, pipY = family.y + family.h, tip = sway(0.8) * 0.02
      this.figure('pip', pipX, pipY, GROWN.pip, { turn: -0.5, lean: tip, blink: blink(seconds, 4.6, 1.2) })
      this.figure('pip', pipX + 3 - tip * 100, pipY - GROWN.pip * 0.9, GROWN.pip * LITTLE, { turn: -0.7, lean: -tip * 2, wings: 0.25 + sway(0.8) * 0.1, blink: blink(seconds, 3.9, 2.5) })
      this.figure('dooo', alone.x + alone.w / 2, alone.y + alone.h, GROWN.dooo * LITTLE, { turn: -0.6, lean: sway(0.6, 2) * 0.025, blink: blink(seconds, 5.3, 3.1) })
      // The one who asks: both wings out to the eggs and empty, its face turned to them, eyes on them.
      this.figure('hoom', ASKER.x + ASKER.w / 2, ASKER.y + ASKER.h, GROWN.hoom, { wings: 1 + sway(1.1) * 0.035, reach: 1, turn: 1, lean: 0.045 + sway(0.7) * 0.012, blink: blink(seconds, 5, 0.4) })
      // Three hides, all one sprite. The middle one has been heard: a crack, and two eyes in the dark of it.
      eggSpots(3).forEach((egg, i) => {
        const x = egg.x + egg.w / 2
        this.put(i === 1 ? props.heard : props.egg, x, FLOOR)
        if (i !== 1) return
        const open = 1 - blink(seconds, 3.3, 0.9) * 0.9
        for (const [ex, ey] of PEEK) { this.put(props.white, x + ex, FLOOR + ey, open); this.put(props.pupil, x + ex - 3, FLOOR + ey + 1, open) }
      })
      const basket = BASKET.x + BASKET.w / 2, floor = BASKET.y + BASKET.h
      this.put(props.rim, basket, floor)
      this.put(props.egg, basket, floor - 34)
      this.put(props.bowl, basket, floor)
      // The one who waits rocks on its feet at the edge, half in the page, and looks at the row.
      this.figure('wheep', view.x + view.w - EDGE_PEEK, FLOOR, GROWN.wheep, { turn: -1, lean: -0.13 + sway(1.5) * 0.03, blink: blink(seconds, 4.2, 2) })
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    return this.count
  }
}
