import type { InkName } from './crayon'
import { KINDS, SHAPES, type Kind } from './parts'

// What the view draws with. A frame is made of three things only: stamps of
// pictures that were drawn in crayon once and kept, a few live crayon lines
// and dots for what changes shape from frame to frame (a mouth, a gust), and
// stamps into two kinds of picture the view keeps up to date itself: the
// picture of the place with everything that lies still on it, and one
// picture for each creature. The view speaks to a pen and never to a canvas,
// so the frame-budget test counts a real frame on a machine that has no
// canvas. The game's draw count is every stamp and every live stroke of a
// frame, wherever it lands: on the surface or in a kept picture.

export type Pen = {
  /** Lays a kept picture down with its own middle at x, y, turned and stretched along its own length and width. */
  stamp(key: string, x: number, y: number, turn?: number, sx?: number, sy?: number, alpha?: number): void
  /** Lays a kept picture down turned first and then stretched along the page: how a whole creature is squashed. */
  sprite(key: string, x: number, y: number, turn: number, sx: number, sy: number, alpha?: number): void
  /** A live crayon line through x, y pairs. */
  line(points: readonly number[], ink: InkName, width: number, alpha?: number): void
  /** A live dot of crayon: an ellipse, filled. */
  dot(x: number, y: number, rx: number, ry: number, ink: InkName, alpha?: number): void
  /** Until `out`, everything is drawn into a kept picture of this name, wiped first: `w` by `h` stage units, with 0, 0 at its middle. */
  into(key: string, w: number, h: number): void
  /** Until `out`, everything is drawn into the kept picture of the place (`laid`), in stage units, and only inside this box of it. */
  patch(x0: number, y0: number, x1: number, y1: number): void
  out(): void
  /** How many stamps and strokes this frame has made so far. */
  readonly count: number
  /** Goes up whenever the kept pictures were all made again: what the view drew into them is gone. */
  readonly epoch: number
}

/** How many drawings each part and each eye has: a thing that moves is redrawn from the next one a few times a second. */
export const LOOKS = 3
export const AIR_HUES = 4
/** The ways a pupil can point in an eye: sixteen round the rim, and the middle. */
export const GAZES = 17
export const AHEAD = 16
/** The most creature pictures kept at once: five creatures, three that are on their way off, and one whose eyes came off. No creature is ever without one. */
export const SLOTS = 9
/** The picture of the heaps that stand at rest, which the view keeps up to date. */
export const ROW = 'row'
/** The pale underside of a maple wing. */
export const PALE = 'maple-pale'

export const partKey = (kind: Kind, look: number): string => `${kind}-${look % LOOKS}`
export const eyeKey = (look: number, gaze: number): string => `eye-${look % LOOKS}-${gaze}`
export const heapKey = (kind: Kind): string => `heap-${kind}`
export const leafKey = (hue: number): string => `leaf-${hue % AIR_HUES}`
export const slotKey = (slot: number): string => `creature-${slot}`

/** Which of the pupil's ways of pointing is nearest to a direction; the middle when it hardly points anywhere. */
export function gazeOf(x: number, y: number): number {
  if (Math.hypot(x, y) < 0.3) return AHEAD
  return ((Math.round(Math.atan2(y, x) / (Math.PI / 8)) % 16) + 16) % 16
}

/** How far past the stage the picture of the place is drawn for a surface the stage is fitted into like this: as far as the surface shows, in steps of twenty. */
export function spillOf(fit: { x: number; y: number; scale: number }): { x: number; y: number } {
  return { x: Math.ceil(fit.x / fit.scale / 20) * 20 + 4, y: Math.ceil(fit.y / fit.scale / 20) * 20 + 4 }
}

/** Every picture the pen keeps, with its size in stage units, and where in it the point lies that a stamp puts at x, y (from the picture's middle). */
export type Picture = { key: string; w: number; h: number; ox: number; oy: number }

export function pictures(): Picture[] {
  const list: Picture[] = []
  const add = (key: string, w: number, h: number, ox = 0, oy = 0): void => { list.push({ key, w, h, ox, oy }) }
  for (const kind of KINDS) {
    for (let look = 0; look < LOOKS; look++) add(partKey(kind, look), SHAPES[kind].long + 28, SHAPES[kind].wide + 28)
    add(heapKey(kind), 190, 150, 0, 10)
  }
  for (let look = 0; look < LOOKS; look++) for (let gaze = 0; gaze < GAZES; gaze++) add(eyeKey(look, gaze), 78, 78)
  for (let hue = 0; hue < AIR_HUES; hue++) add(leafKey(hue), 48, 30)
  add(PALE, SHAPES.maple.long + 28, SHAPES.maple.wide + 28)
  add('pupil', 22, 22)
  add('cheek', 66, 62)
  add('flush', 150, 120)
  add('shut', 44, 30)
  add('mitt', 62, 56)
  add('stir', 100, 116)
  add('wind-big', 300, 236, 0, -4)
  add('wind-small', 230, 190, 0, 3)
  add('toad', 204, 164)
  add('lid', 62, 62)
  add('frond', 190, 280, 0, -124)
  add('hand', 84, 104)
  add('glow', 196, 176)
  add('shade', 132, 64)
  add('acorn', 70, 78)
  return list
}

/** A pen that draws nothing and counts: what the frame-budget test and the view's own tests hold a frame to. */
export class CountingPen implements Pen {
  stamps = 0
  strokes = 0
  /** Of those, how many went into a kept picture. */
  kept = 0
  epoch = 0
  /** Every key stamped since the last reset, in order; a stamp into a kept picture has `>` before it. */
  readonly keys: string[] = []
  readonly known = new Set(pictures().map((picture) => picture.key))
  readonly unknown: string[] = []
  /** The picture being drawn into, or null. */
  target: string | null = null
  /** The pictures the view has drawn into, and each time it began to since the last reset. */
  readonly made = new Set<string>()
  readonly begun: string[] = []

  reset(): void {
    this.stamps = 0; this.strokes = 0; this.kept = 0; this.keys.length = 0; this.begun.length = 0
  }

  stamp(key: string): void {
    this.stamps++
    if (this.target) this.kept++
    this.keys.push(this.target ? `>${key}` : key)
    if (key !== 'scenery' && !this.known.has(key) && !this.made.has(key)) this.unknown.push(key)
  }

  sprite(key: string): void {
    this.stamp(key)
  }

  line(): void {
    this.strokes++
    if (this.target) this.kept++
  }

  dot(): void {
    this.strokes++
    if (this.target) this.kept++
  }

  into(key: string): void {
    this.target = key
    this.made.add(key)
    this.begun.push(key)
  }

  patch(): void {
    this.target = 'laid'
    this.made.add('laid')
    this.begun.push('laid')
  }

  out(): void {
    this.target = null
  }

  get count(): number {
    return this.stamps + this.strokes
  }
}
