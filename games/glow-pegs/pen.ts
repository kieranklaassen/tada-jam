import { BLUE, BOARD, GREEN, HOLE_MARK, PEG_RADIUS, PITCH, RED, WHITE, YELLOW, type Colour } from './board'

// The look's tools. The setting and the three characters are bright thin
// lines on black, each with a wide dim line under it, added to what is
// there, so lines that cross grow brighter the way phosphor does. The pegs
// and the lamps are the lit things: solid caps of light, filled. Black is
// filled to hide what is behind a body.
//
// Still things are drawn once, with more passes, into the still layer or a
// sprite. Things that move are drawn each frame with one wide pass at most.

export type Ctx = CanvasRenderingContext2D
/** Makes an offscreen canvas of a size in device pixels. The Mount gives the document's; a test gives a stand-in. */
export type MakeCanvas = (width: number, height: number) => HTMLCanvasElement

export const INK = {
  /** The setting: the cabinet's walls, wires and web. Lower in contrast than anything that answers a touch. */
  wall: '#5350d6',
  far: '#2b2f86',
  grid: '#1c6f80',
  web: '#8d72d8',
  bezel: '#8f8cff',
  hole: '#39437f',
  /** What can be touched as a control: the wells and the buttons. */
  touch: '#ffab40',
  bulb: '#ffc98a',
  spider: '#ff5fd2',
  gecko: '#5ff2d6',
  moth: '#dcc2ff',
  hand: '#ffffff',
} as const

export const PEG_INK: Record<Colour, string> = { [RED]: '#ff4257', [BLUE]: '#4a8dff', [YELLOW]: '#ffe14a', [GREEN]: '#4dff88', [WHITE]: '#ffffff' }

/** What has been drawn since the view last set it to nothing: the frame's draw count is the stamps, the strokes and the fills together. */
export const tally = { stamps: 0, strokes: 0, fills: 0 }

/** Fills the current path black, to hide what is behind a body. */
export function fillBlack(ctx: Ctx, alpha = 1): void {
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#000000'
  ctx.fill()
  ctx.globalAlpha = 1
  tally.fills += 1
}

/** Rubs out whatever the live layer holds inside the current path, so the still layer shows there again. */
export function rubOut(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'destination-out'
  ctx.globalAlpha = 1
  ctx.fillStyle = '#000000'
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  tally.fills += 1
}

/** Fills the current path with a colour: a pupil, a lamp, a flash of light. `added` adds it to what is there. */
export function fillInk(ctx: Ctx, colour: string, alpha = 1, added = false): void {
  ctx.fillStyle = colour
  ctx.globalAlpha = alpha
  if (added) ctx.globalCompositeOperation = 'lighter'
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  tally.fills += 1
}

/** Stamps a drawing made once where it belongs. */
export function stampAt(ctx: Ctx, stamp: Stamp): void {
  ctx.drawImage(stamp.image, stamp.x, stamp.y, stamp.width, stamp.height)
  tally.stamps += 1
}

/** Stamps a sprite with its middle at a point, at a size in stage units. */
export function stamp(ctx: Ctx, image: HTMLCanvasElement, x: number, y: number, size: number): void {
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size)
  tally.stamps += 1
}

/** Strokes the current path as a moving line: one wide dim pass added under one thin bright pass. `halo` of 0 leaves the wide pass out. */
export function glow(ctx: Ctx, colour: string, width: number, halo: number, alpha = 1): void {
  ctx.strokeStyle = colour
  if (halo > 0) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = halo * alpha
    ctx.lineWidth = width * 4.5
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    tally.strokes += 1
  }
  ctx.globalAlpha = alpha
  ctx.lineWidth = width
  ctx.stroke()
  ctx.globalAlpha = 1
  tally.strokes += 1
}

/**
 * Strokes the current path as a still line: three passes, wide to thin, each added to what is there. `tight`
 * keeps the wide passes close, for a peg whose glow must stay inside its own cell.
 */
export function still(ctx: Ctx, colour: string, width: number, alpha = 1, tight = false): void {
  ctx.strokeStyle = colour
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = (tight ? 0.12 : 0.07) * alpha
  ctx.lineWidth = width * (tight ? 2.8 : 7)
  ctx.stroke()
  ctx.globalAlpha = (tight ? 0.3 : 0.2) * alpha
  ctx.lineWidth = width * (tight ? 1.8 : 3)
  ctx.stroke()
  ctx.globalAlpha = alpha
  ctx.lineWidth = width
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

export function ring(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y)
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

/** The side of a peg's sprite in stage units: its own cell, so no peg's glow reaches into the next. */
export const SPRITE = PITCH

/** A drawing made once and stamped: where its top left corner goes on the stage, and its size there. */
export type Stamp = { image: HTMLCanvasElement; x: number; y: number; width: number; height: number }

export type Sprites = {
  /** One lit peg of each colour, and the dark pit of an empty hole. */
  peg: Record<Colour, HTMLCanvasElement>
  pit: HTMLCanvasElement
  /** The beam: a soft bar of light one column wide and as tall as the board with its bezel. */
  beam: HTMLCanvasElement
}

/** The beam's sprite stands this tall on the stage. */
export const BEAM_HEIGHT = BOARD.height + 20

/** A peg's body in three shades: where the light catches it, its own colour, and its shadowed edge. */
const SHADES: Record<Colour, readonly [string, string, string]> = {
  [RED]: ['#ffd0d4', '#ff4257', '#8f1422'],
  [BLUE]: ['#d3e4ff', '#4a8dff', '#17398f'],
  [YELLOW]: ['#fffbd6', '#ffe14a', '#a07a08'],
  [GREEN]: ['#dbffe7', '#4dff88', '#128a3c'],
  [WHITE]: ['#ffffff', '#e6ecff', '#7d88b8'],
}

/**
 * Draws a lit peg: a round glowing cap seen from the front. A soft bloom around it, a body that is light where
 * the lamp behind catches it, off to the upper left, and dark at its far edge, and one small bright glint. It is
 * a solid thing and never a ring.
 */
export function pegCap(ctx: Ctx, colour: Colour, x: number, y: number, scale: number): void {
  const r = (PEG_RADIUS - 2) * scale
  const [light, mid, dark] = SHADES[colour]
  const bloom = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.42)
  bloom.addColorStop(0, mid + '90')
  bloom.addColorStop(1, mid + '00')
  ctx.fillStyle = bloom
  ctx.beginPath()
  ctx.arc(x, y, r * 1.42, 0, Math.PI * 2)
  ctx.fill()
  const body = ctx.createRadialGradient(x - r * 0.34, y - r * 0.4, r * 0.05, x, y, r)
  body.addColorStop(0, light)
  body.addColorStop(0.45, mid)
  body.addColorStop(1, dark)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  // The glint: a small tilted oval, off-centre.
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.ellipse(x - r * 0.42, y - r * 0.5, r * 0.26, r * 0.14, -0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

/** Draws an empty hole: a dark pit sunk in the board, its far lip catching a little light. Not a ring. */
export function pit(ctx: Ctx, x: number, y: number, r: number): void {
  const well = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, 0, x, y, r)
  well.addColorStop(0, '#02030a')
  well.addColorStop(0.7, '#0c1130')
  well.addColorStop(1, '#1b2350')
  ctx.fillStyle = well
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r, 0.25, Math.PI * 0.8)
  ctx.strokeStyle = INK.hole
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.stroke()
}

/** Every sprite, drawn once at a pixel ratio. They are made again when the ratio changes, so nothing blurs. */
export function makeSprites(make: MakeCanvas, ratio: number): Sprites {
  const one = (width: number, height: number, draw: (ctx: Ctx) => void): HTMLCanvasElement => {
    const canvas = make(Math.round(width * ratio), Math.round(height * ratio))
    const ctx = canvas.getContext('2d') as Ctx
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    draw(ctx)
    return canvas
  }
  const peg = {} as Record<Colour, HTMLCanvasElement>
  for (const colour of [RED, BLUE, YELLOW, GREEN, WHITE] as const) peg[colour] = one(SPRITE, SPRITE, (ctx) => pegCap(ctx, colour, SPRITE / 2, SPRITE / 2, 1))
  const hole = one(SPRITE, SPRITE, (ctx) => pit(ctx, SPRITE / 2, SPRITE / 2, HOLE_MARK))
  const beam = one(PITCH, BEAM_HEIGHT, (ctx) => {
    // Bright down its middle, gone at its edges, and a little brighter at its top and bottom ends.
    const across = ctx.createLinearGradient(0, 0, PITCH, 0)
    across.addColorStop(0, '#ffffff00')
    across.addColorStop(0.5, '#ffffff5c')
    across.addColorStop(1, '#ffffff00')
    ctx.fillStyle = across
    ctx.fillRect(0, 0, PITCH, BEAM_HEIGHT)
    const along = ctx.createLinearGradient(0, 0, 0, BEAM_HEIGHT)
    along.addColorStop(0, '#bfc8ff60')
    along.addColorStop(0.08, '#bfc8ff00')
    along.addColorStop(0.92, '#bfc8ff00')
    along.addColorStop(1, '#bfc8ff60')
    ctx.fillStyle = along
    ctx.fillRect(PITCH * 0.25, 0, PITCH * 0.5, BEAM_HEIGHT)
  })
  return { peg, pit: hole, beam }
}

/** Short dashes flying out from a point: unequal in length and unevenly spread, so they never make a star or a sign. */
export function dashes(ctx: Ctx, x: number, y: number, from: number, length: number, count: number, turn: number): void {
  for (let i = 0; i < count; i++) {
    const a = turn + ((i + 0.37 * Math.sin(i * 2.4 + 1)) / count) * Math.PI * 2
    const near = from * (0.82 + 0.3 * Math.abs(Math.sin(i * 1.7 + 0.5))), far = near + length * (0.55 + 0.9 * Math.abs(Math.sin(i * 2.9 + 2)))
    ctx.moveTo(x + Math.cos(a) * near, y + Math.sin(a) * near)
    ctx.lineTo(x + Math.cos(a) * far, y + Math.sin(a) * far)
  }
}
