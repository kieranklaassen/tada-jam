// Gummed paper: flat shiny shapes cut by a machine, stuck a little crooked on
// black. A shape has a thin pale edge where the gum shows, a broad gloss and a
// small hard shadow, and now and then a corner that has lifted.
// Asleep, a paper is its own colour sunk into the night; awake, it is pure.

export type Colour = 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'white' | 'black'
export type Tone = 'dark' | 'lit'

const PURE: Readonly<Record<Colour, string>> = { red: '#ea3323', yellow: '#ffcb1f', blue: '#2273e6', green: '#17a552', orange: '#f5821f', white: '#f8f2e4', black: '#17161c' }
export const DARK: Readonly<Record<Colour, string>> = { red: '#8c2a3a', yellow: '#8f7a3c', blue: '#27407f', green: '#1c5a4c', orange: '#8a5238', white: '#8087a6', black: '#100f15' }
export const ink = (colour: Colour, tone: Tone): string => (tone === 'lit' ? PURE[colour] : DARK[colour])

type Pen = CanvasRenderingContext2D
export type Curl = { x: number; y: number; ax: number; ay: number; bx: number; by: number }

/** Sticks down one piece of paper whose outline `trace` draws. */
export function piece(g: Pen, tone: Tone, colour: Colour, trace: (g: Pen) => void, box: readonly [number, number, number, number], curl?: Curl): void {
  g.save()
  g.translate(2.5, 4)
  g.fillStyle = 'rgba(0,0,0,0.42)'
  g.beginPath(); trace(g); g.fill()
  g.restore()
  g.save()
  g.beginPath(); trace(g)
  g.fillStyle = ink(colour, tone); g.fill()
  g.clip()
  const [x, y, w, h] = box
  const shine = g.createLinearGradient(x, y, x + w, y + h)
  const a = tone === 'lit' ? 0.3 : 0.13
  shine.addColorStop(0, `rgba(255,255,255,${a * 0.6})`); shine.addColorStop(0.28, 'rgba(255,255,255,0)'); shine.addColorStop(0.42, 'rgba(255,255,255,0)')
  shine.addColorStop(0.46, `rgba(255,255,255,${a})`); shine.addColorStop(0.58, `rgba(255,255,255,${a})`); shine.addColorStop(0.6, 'rgba(255,255,255,0)'); shine.addColorStop(1, 'rgba(0,0,0,0.12)')
  g.fillStyle = shine; g.fillRect(x - 4, y - 4, w + 8, h + 8)
  g.translate(0.8, 0.8)
  g.beginPath(); trace(g)
  g.strokeStyle = tone === 'lit' ? 'rgba(255,255,255,0.65)' : 'rgba(225,230,255,0.3)'; g.lineWidth = 2; g.stroke()
  g.restore()
  if (curl) {
    g.fillStyle = 'rgba(0,0,0,0.4)'
    g.beginPath(); g.moveTo(curl.x + curl.ax, curl.y + curl.ay); g.lineTo(curl.x + curl.bx, curl.y + curl.by); g.lineTo(curl.x + (curl.ax + curl.bx) * 0.95 + 3, curl.y + (curl.ay + curl.by) * 0.95 + 4); g.fill()
    g.fillStyle = tone === 'lit' ? '#fff8e6' : '#8d92ad'
    g.beginPath(); g.moveTo(curl.x + curl.ax, curl.y + curl.ay); g.lineTo(curl.x + curl.bx, curl.y + curl.by); g.lineTo(curl.x + (curl.ax + curl.bx) * 0.82, curl.y + (curl.ay + curl.by) * 0.82); g.fill()
  }
}
export const circle = (g: Pen, tone: Tone, colour: Colour, x: number, y: number, r: number): void => piece(g, tone, colour, (p) => p.arc(x, y, r, 0, Math.PI * 2), [x - r, y - r, r * 2, r * 2])
/** Half a circle; `turn` is the way its round side faces, in radians, 0 for up. */
export const half = (g: Pen, tone: Tone, colour: Colour, x: number, y: number, r: number, turn = 0): void => piece(g, tone, colour, (p) => { p.arc(x, y, r, Math.PI + turn, Math.PI * 2 + turn); p.closePath() }, [x - r, y - r, r * 2, r * 2])
export function poly(g: Pen, tone: Tone, colour: Colour, points: readonly number[], curl?: Curl): void {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
  for (let i = 0; i < points.length; i += 2) { l = Math.min(l, points[i]); r = Math.max(r, points[i]); t = Math.min(t, points[i + 1]); b = Math.max(b, points[i + 1]) }
  piece(g, tone, colour, (p) => { p.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2) p.lineTo(points[i], points[i + 1]); p.closePath() }, [l, t, r - l, b - t], curl)
}
export const rect = (g: Pen, tone: Tone, colour: Colour, x: number, y: number, w: number, h: number, curl?: Curl): void => poly(g, tone, colour, [x, y, x + w, y, x + w, y + h, x, y + h], curl)
/** A strip from one point to another. */
export function strip(g: Pen, tone: Tone, colour: Colour, ax: number, ay: number, bx: number, by: number, width: number): void {
  const l = Math.hypot(bx - ax, by - ay) || 1, nx = (-(by - ay) / l) * width * 0.5, ny = ((bx - ax) / l) * width * 0.5
  poly(g, tone, colour, [ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny])
}
