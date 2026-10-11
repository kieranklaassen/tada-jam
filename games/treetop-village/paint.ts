// The pop-up book's hand: how a piece of printed card is drawn. A card is a
// flat bright shape with no outline. It reads as card because of two copies
// of its own shape: a pale one up and to the left, the cut edge catching the
// daylight, and a soft dark one down and to the right, the small shadow it
// throws on what stands behind it.

export type G = CanvasRenderingContext2D

/** One sprite: its box in the units it is drawn in, around the point it is pinned by, and how to draw it there. `night` draws what is added to it under the evening sheet. */
export type SpriteDef = { x: number; y: number; w: number; h: number; draw: (g: G) => void; night?: (g: G) => void }

export const PAPER = '#fffaf0'
export const INK = '#3b2a1f'
export const SHADOW = 'rgba(58, 40, 22, 0.24)'

export const C = {
  sky: '#bfe4f3', skyLow: '#e3f3f4', hillFar: '#b4dba6', hillNear: '#86c97a', meadow: '#acdb72', meadowDark: '#93cb60', path: '#ead9a4',
  trunk: '#b8793f', barkDark: '#94602f', barkLight: '#d39a5c', top: '#e6b676',
  leafA: '#4aa24a', leafB: '#6cc04f', leafC: '#93d45c', leafD: '#3a8c50', gold: '#f3c84a',
  wood: '#f8e6b8', woodDark: '#d9b97a', line: '#6b4a2b', rope: '#e8cf9c', bark: '#eccb94', lamp: '#ffe270',
  basket: '#c9954f', basketDark: '#a87638', felt: '#3f5b55',
  red: '#e2503f', blue: '#3f72c4', teal: '#2fa59c', cream: '#fbe9c8', pink: '#f6a9b9',
} as const

/** A card: `shape` begins and lays the path, and may be asked for it three times. */
export function card(g: G, shape: (g: G) => void, fill: string, lift = 3): void {
  g.save()
  g.translate(lift, lift + 1)
  shape(g)
  g.fillStyle = SHADOW
  g.fill()
  g.restore()
  g.save()
  g.translate(-1.6, -1.6)
  shape(g)
  g.fillStyle = PAPER
  g.fill()
  g.restore()
  shape(g)
  g.fillStyle = fill
  g.fill()
}

/** Print on a card: a flat shape with no edge and no shadow. */
export function print(g: G, shape: (g: G) => void, fill: string): void {
  shape(g)
  g.fillStyle = fill
  g.fill()
}

export function line(g: G, points: readonly (readonly [number, number])[], colour: string, width: number): void {
  g.beginPath()
  points.forEach(([x, y], index) => (index === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.stroke()
}

export const blob = (x: number, y: number, rx: number, ry = rx, rot = 0) => (g: G): void => {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

export const poly = (points: readonly (readonly [number, number])[]) => (g: G): void => {
  g.beginPath()
  points.forEach(([x, y], index) => (index === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  g.closePath()
}

export const round = (x: number, y: number, w: number, h: number, r: number) => (g: G): void => {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

/** A curve through two ends with one pull point: a limb, a sagging rope, a smile. */
export function curve(g: G, ax: number, ay: number, cx: number, cy: number, bx: number, by: number, colour: string, width: number): void {
  g.beginPath()
  g.moveTo(ax, ay)
  g.quadraticCurveTo(cx, cy, bx, by)
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.stroke()
}

/** The fold a standing card stands on: a pale strip at its foot and the shadow it lays on the page. */
export function fold(g: G, x0: number, x1: number, y: number): void {
  g.fillStyle = 'rgba(58, 40, 22, 0.18)'
  g.beginPath()
  g.ellipse((x0 + x1) / 2, y + 5, (x1 - x0) / 2 + 8, 7, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PAPER
  g.fillRect(x0, y - 1, x1 - x0, 4)
}

/** A stream of chance for the print only, fixed, so the page is the same on every visit. */
export function printRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
