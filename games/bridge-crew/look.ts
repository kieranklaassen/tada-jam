// The look, Blueprint and balsa: a cyanotype drawing sheet with white drafting
// lines and a faint grid, and real parts lying on it: unstained balsa, rolled
// paper, steel pins and string, each with a small hard shadow (ART.md, "The
// look"). These are the drawing primitives; they hold no game state and take
// every position in pixels.

export const INK = {
  /** The one blue of the sheet, its darker pooling and the shadow a part throws on it. */
  sheet: '#1f4f8f',
  sheetDeep: '#1a437c',
  sheetPale: '#2a5c9d',
  shadow: '#123463',
  /** The drafting line. */
  line: '#f2f6fb',
  /** Unstained balsa: face, grain and end. */
  balsa: '#ecdcb6',
  balsaGrain: '#d8c391',
  balsaEdge: '#b9a16d',
  /** Drawing paper, for tubes, models and the roll. */
  paper: '#f6f2e8',
  paperShade: '#d9d3c4',
  /** Steel pins. */
  steel: '#dfe5ec',
  steelDark: '#6d7a8a',
  /** String. */
  string: '#efe7d2',
  stringTwist: '#b8ab8a',
  /** The one warm accent, kept for the pencil. */
  pencil: '#e3b23c',
} as const

/** A small seeded stream, so the same sheet is drawn every time. */
export function stream(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Pen = CanvasRenderingContext2D

/** A drafting line: drawn in a few lengths whose width wavers a little, as a ruling pen's does. */
export function rule(pen: Pen, x0: number, y0: number, x1: number, y1: number, width: number, alpha: number, random: () => number) {
  const pieces = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / (width * 60)))
  pen.strokeStyle = INK.line
  pen.lineCap = 'round'
  for (let i = 0; i < pieces; i++) {
    const a = i / pieces, b = (i + 1) / pieces
    pen.globalAlpha = alpha * (0.85 + 0.15 * random())
    pen.lineWidth = width * (0.8 + 0.4 * random())
    pen.beginPath()
    pen.moveTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a)
    pen.lineTo(x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)
    pen.stroke()
  }
  pen.globalAlpha = 1
}

/** Section hatching inside a closed outline: thin parallel lines at a slant, the draughtsman's sign for cut ground. */
export function hatch(pen: Pen, outline: readonly (readonly [number, number])[], gap: number, width: number, alpha: number) {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (const [x, y] of outline) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  pen.save()
  pen.beginPath()
  outline.forEach(([x, y], i) => (i ? pen.lineTo(x, y) : pen.moveTo(x, y)))
  pen.closePath()
  pen.clip()
  pen.strokeStyle = INK.line
  pen.globalAlpha = alpha
  pen.lineWidth = width
  pen.beginPath()
  const tall = bottom - top
  for (let x = left - tall; x < right; x += gap) { pen.moveTo(x, bottom); pen.lineTo(x + tall, top) }
  pen.stroke()
  pen.restore()
}

/** The hard shadow every real part throws on the sheet: the same shape, moved down and right, in the darker blue. */
export const SHADOW = { x: 0.07, y: 0.09 } as const

/** What a kit part looks like: a balsa plank flat or on edge, a balsa stick, or a rolled paper tube. */
export type Wood = 'plank' | 'plank-edge' | 'stick' | 'tube'

/** How thick each lies in the side view, in cells. */
export const THICK: Readonly<Record<Wood, number>> = { plank: 0.13, 'plank-edge': 0.4, stick: 0.13, tube: 0.26 }

function bar(pen: Pen, long: number, thick: number, round: number) {
  pen.beginPath()
  pen.roundRect(-round, -thick / 2, long + 2 * round, thick, round)
}

/** How far a part of this kind runs on past its pins at each end, in pixels. */
const overhangOf = (kind: Wood, cell: number) => (kind === 'tube' ? 0 : THICK[kind] * cell * 0.5)

/**
 * The shadow of a part alone. `lift` is how far above the sheet the part is,
 * in shadow lengths: 1 lying on it, more while it is carried or still landing.
 */
export function woodShadow(pen: Pen, kind: Wood, x0: number, y0: number, x1: number, y1: number, cell: number, lift = 1, thicken = 1) {
  const long = Math.hypot(x1 - x0, y1 - y0), thick = THICK[kind] * cell * thicken, round = kind === 'tube' ? thick / 2 : thick * 0.12, overhang = overhangOf(kind, cell)
  pen.save()
  pen.translate(x0 + SHADOW.x * cell * lift, y0 + SHADOW.y * cell * lift); pen.rotate(Math.atan2(y1 - y0, x1 - x0)); pen.translate(-overhang, 0)
  pen.fillStyle = INK.shadow
  bar(pen, long + 2 * overhang, thick, round); pen.fill()
  pen.restore()
}

/** A balsa or paper part from one pin to another, with its shadow unless `shadow` is false. `cell` is the size of a grid cell in pixels; `grain` draws the fine lines a lower tier leaves out. */
export function wood(pen: Pen, kind: Wood, x0: number, y0: number, x1: number, y1: number, cell: number, random: () => number, shadow = true, grain = true) {
  const long = Math.hypot(x1 - x0, y1 - y0), thick = THICK[kind] * cell, round = kind === 'tube' ? thick / 2 : thick * 0.12
  const overhang = overhangOf(kind, cell)
  if (shadow) woodShadow(pen, kind, x0, y0, x1, y1, cell)

  pen.save()
  pen.translate(x0, y0); pen.rotate(Math.atan2(y1 - y0, x1 - x0)); pen.translate(-overhang, 0)
  const whole = long + 2 * overhang
  pen.fillStyle = kind === 'tube' ? INK.paper : INK.balsa
  bar(pen, whole, thick, round); pen.fill()
  pen.save()
  bar(pen, whole, thick, round); pen.clip()
  if (kind === 'tube') {
    // Rolled paper: the seam winds round it, and its underside is in shade.
    pen.fillStyle = INK.paperShade
    pen.globalAlpha = 0.7
    pen.fillRect(0, thick * 0.18, whole, thick * 0.4)
    pen.globalAlpha = 1
    pen.strokeStyle = INK.paperShade
    pen.lineWidth = Math.max(1, cell * 0.02)
    pen.beginPath()
    if (grain) for (let x = -thick; x < whole; x += thick * 1.6) { pen.moveTo(x, thick / 2); pen.lineTo(x + thick * 0.9, -thick / 2) }
    pen.stroke()
  } else {
    // Balsa grain runs along the part: a few long pale-brown lines, never quite straight.
    pen.strokeStyle = INK.balsaGrain
    pen.lineWidth = Math.max(0.75, cell * 0.014)
    const lines = grain ? (kind === 'plank-edge' ? 6 : 2) : 0
    for (let i = 0; i < lines; i++) {
      const y = -thick / 2 + (thick * (i + 0.5 + 0.3 * (random() - 0.5))) / lines
      pen.globalAlpha = 0.5 + 0.5 * random()
      pen.beginPath()
      pen.moveTo(whole * 0.04 * random(), y)
      pen.bezierCurveTo(whole * 0.3, y + thick * 0.06 * (random() - 0.5), whole * 0.7, y + thick * 0.06 * (random() - 0.5), whole * (1 - 0.04 * random()), y)
      pen.stroke()
    }
    pen.globalAlpha = 1
    // The lower edge is the cut side, a shade darker.
    pen.fillStyle = INK.balsaEdge
    pen.globalAlpha = 0.55
    pen.fillRect(0, thick / 2 - Math.max(1, thick * 0.16), whole, Math.max(1, thick * 0.16))
    pen.globalAlpha = 1
  }
  pen.restore()
  pen.restore()
}

/** String between two pins. Taut it is straight; slack it hangs in a shallow curve. */
export function string(pen: Pen, x0: number, y0: number, x1: number, y1: number, cell: number, slack = 0) {
  const sag = slack * cell, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag
  const draw = (dx: number, dy: number, colour: string, width: number, dash: number[]) => {
    pen.strokeStyle = colour
    pen.lineWidth = width
    pen.lineCap = 'round'
    pen.setLineDash(dash)
    pen.beginPath()
    pen.moveTo(x0 + dx, y0 + dy)
    pen.quadraticCurveTo(mx + dx, my + dy + sag, x1 + dx, y1 + dy)
    pen.stroke()
    pen.setLineDash([])
  }
  const width = Math.max(1.5, cell * 0.05)
  draw(SHADOW.x * cell, SHADOW.y * cell, INK.shadow, width, [])
  draw(0, 0, INK.string, width, [])
  // The twist of the string, as short darker dashes along it.
  draw(0, 0, INK.stringTwist, width * 0.45, [width * 0.9, width * 1.5])
}

/** A steel pin seen from above: a round head with a hard highlight. A footing pin sits in a drafting triangle. */
export function pin(pen: Pen, x: number, y: number, cell: number, footing: boolean) {
  const r = cell * 0.085
  if (footing) {
    pen.strokeStyle = INK.line
    pen.lineWidth = Math.max(1, cell * 0.028)
    pen.globalAlpha = 0.9
    pen.beginPath()
    pen.moveTo(x, y); pen.lineTo(x - cell * 0.2, y + cell * 0.3); pen.lineTo(x + cell * 0.2, y + cell * 0.3); pen.closePath()
    pen.stroke()
    pen.globalAlpha = 1
  }
  pen.fillStyle = INK.shadow
  pen.beginPath(); pen.arc(x + SHADOW.x * cell * 0.7, y + SHADOW.y * cell * 0.7, r, 0, Math.PI * 2); pen.fill()
  pen.fillStyle = INK.steel
  pen.beginPath(); pen.arc(x, y, r, 0, Math.PI * 2); pen.fill()
  pen.strokeStyle = INK.steelDark
  pen.lineWidth = Math.max(0.75, cell * 0.018)
  pen.stroke()
  pen.fillStyle = '#ffffff'
  pen.beginPath(); pen.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, Math.PI * 2); pen.fill()
}
