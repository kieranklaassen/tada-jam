// Where the view gets the sheets it draws on. On the page they are canvases;
// in a test they are stand-ins that keep count (recording.ts), so the real
// view runs on a machine with no canvas at all.

export type G = CanvasRenderingContext2D

/** One sheet to draw on, with its pen. */
export type Sheet = { canvas: CanvasImageSource; g: G }
export type MakeSheet = (width: number, height: number) => Sheet

/** Sheets on the page. */
export const pageSheets: MakeSheet = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return { canvas, g: canvas.getContext('2d')! }
}

export type Box4 = { x: number; y: number; w: number; h: number }

/** A picture drawn once and stamped after: its sheet, and the box of the stage it covers, measured from its own origin. */
export type Sprite = Box4 & { sheet: Sheet }

/** Draws `paint`, which works in stage units, once onto a sheet of its own at `k` pixels to a unit. */
export function bake(make: MakeSheet, k: number, box: Box4, paint: (g: G) => void): Sprite {
  const sheet = make(Math.ceil(box.w * k), Math.ceil(box.h * k)), g = sheet.g
  g.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  paint(g)
  return { sheet, ...box }
}

/** What a frame cost: sprites stamped, and pen strokes and fills. Their sum is the frame's draw number. */
export type Tally = { stamps: number; pen: number }

/** The pen the frame is drawn with: every stamp, fill and stroke goes through it and is counted. */
export class Pen {
  readonly g: G
  readonly tally: Tally
  constructor(g: G, tally: Tally) {
    this.g = g
    this.tally = tally
  }
  /** Stamps a sprite with its origin at `(x, y)`. */
  stamp(sprite: Sprite, x = 0, y = 0): void {
    this.g.drawImage(sprite.sheet.canvas, sprite.x + x, sprite.y + y, sprite.w, sprite.h)
    this.tally.stamps += 1
  }
  /** Stamps a whole picture into a box. */
  image(picture: CanvasImageSource, x: number, y: number, w: number, h: number): void {
    this.g.drawImage(picture, x, y, w, h)
    this.tally.stamps += 1
  }
  fill(style: string): void {
    this.g.fillStyle = style
    this.g.fill()
    this.tally.pen += 1
  }
  line(style: string, width: number): void {
    this.g.strokeStyle = style
    this.g.lineWidth = width
    this.g.stroke()
    this.tally.pen += 1
  }
}
