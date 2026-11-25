import { COLOR as C, INK, Brush, oval, poly, smooth } from './brush'
import { BASKET, FLOOR, SUN, WINDOW } from './layout'

// The room, painted once for day and once for night, past the stage's edges on
// every side: one colour of wall, one of floor, a window, a stove and a rug.

export const PAD = 420

const S = {
  frame: poly(80, [-WINDOW.w / 2, -WINDOW.h / 2, WINDOW.w / 2, -WINDOW.h / 2, WINDOW.w / 2, WINDOW.h / 2, -WINDOW.w / 2, WINDOW.h / 2]),
  sill: smooth(81, [-150, -12, 150, -12, 156, 14, -156, 14], true, 1, 4), hill: smooth(82, [-112, 60, -60, 30, 0, 48, 60, 22, 112, 50, 112, 110, -112, 110], true, 1),
  rug: oval(83, 340, 46), basket: smooth(84, [-150, -20, 150, -20, 132, 120, 110, 190, -110, 190, -132, 120], true, 1.2, 5), rim: smooth(85, [-160, -26, 160, -26, 162, 18, -162, 18], true, 1.2, 4), lid: smooth(86, [-160, 20, -170, -90, -166, -210, -120, -288, 0, -306, 120, -288, 166, -210, 170, -90, 160, 20], true, 1.2),
  ray: poly(87, [-10, 0, 10, 0, 0, -26]), disc: oval(88, SUN.r, SUN.r), cat: smooth(89, [-52, 40, -54, 0, -44, -44, -24, -26, 24, -26, 44, -44, 54, 0, 52, 40]), shelf: smooth(90, [-190, -8, 190, -8, 190, 12, -190, 12], true, 1, 4),
  jug: smooth(91, [-30, 0, -36, -40, -18, -72, 18, -72, 36, -40, 30, 0]), plate: oval(92, 40, 40), tulip: smooth(93, [-22, -30, -10, -12, 0, -34, 10, -12, 22, -30, 18, 8, 0, 16, -18, 8]), flake: oval(94, 7, 7, 0.4),
} as const

export function paintRoom(pen: CanvasRenderingContext2D, night: boolean): void {
  const b = new Brush(pen)
  pen.lineJoin = pen.lineCap = 'round'
  const wall = night ? C.night : C.blue, floor = night ? '#0f5a3c' : C.green, white = night ? '#b9c4e0' : C.white
  pen.fillStyle = wall; pen.fillRect(-PAD, -PAD, 1180 + PAD * 2, FLOOR + PAD - 74)
  pen.fillStyle = floor; pen.fillRect(-PAD, FLOOR - 74, 1180 + PAD * 2, 900)
  // The skirting: a white band and two lines.
  b.lay(poly(95, [-PAD - 20, FLOOR - 112, 1200 + PAD, FLOOR - 112, 1200 + PAD, FLOOR - 74, -PAD - 20, FLOOR - 74]), white)
  b.lay(S.rug, night ? '#7d1d1a' : C.red, { x: 440, y: FLOOR + 22 })
  b.lay(S.rug, null, { x: 440, y: FLOOR + 22, sx: 0.86, sy: 0.7, ink: night ? '#c79a2a' : C.yellow, line: 8 })
  // A shelf with a jug and plates on the left, and what hangs on the right.
  b.lay(S.shelf, night ? '#9a7028' : C.straw, { x: 150, y: 150 })
  b.lay(S.plate, white, { x: 52, y: 100 }); b.lay(S.plate, null, { x: 52, y: 100, sx: 0.55, sy: 0.55, ink: night ? '#31508f' : C.blue, line: 7 })
  b.lay(S.jug, night ? '#8d221c' : C.red, { x: 150, y: 142 }); b.curve(186, 118, 214, 104, 184, 84, 9)
  b.curve(150, 70, 150, 56, 146, 46, 8); b.lay(S.tulip, night ? '#b18a20' : C.yellow, { x: 146, y: 40 })
  b.lay(S.plate, white, { x: 258, y: 100 }); b.lay(S.plate, null, { x: 258, y: 100, sx: 0.55, sy: 0.55, ink: night ? '#31508f' : C.blue, line: 7 })
  for (const x of [-250, -140, 1290, 1400]) { b.lay(S.plate, white, { x, y: 190 }); b.lay(S.plate, null, { x, y: 190, sx: 0.55, sy: 0.55, ink: night ? '#31508f' : C.blue, line: 7 }) }
  // The window: sky, snowy hill, a white frame. The sun is drawn live.
  b.lay(S.frame, night ? '#0a1636' : '#8fd0ee', { x: WINDOW.x, y: WINDOW.y })
  pen.save(); pen.beginPath(); pen.rect(WINDOW.x - WINDOW.w / 2, WINDOW.y - WINDOW.h / 2, WINDOW.w, WINDOW.h); pen.clip()
  b.lay(S.hill, white, { x: WINDOW.x, y: WINDOW.y + 22 }); pen.restore()
  b.lay(S.frame, null, { x: WINDOW.x, y: WINDOW.y, line: 24 }); b.lay(S.frame, null, { x: WINDOW.x, y: WINDOW.y, line: 10, ink: white })
  b.lay(S.sill, white, { x: WINDOW.x, y: WINDOW.y + WINDOW.h / 2 + 18 })
}

/** The open lid behind the heap, lined in white so that every thing stands out. */
export function drawBasketBack(b: Brush, x: number): void {
  b.lay(S.lid, C.straw, { x: BASKET.x + x, y: BASKET.top }); b.lay(S.lid, C.white, { x: BASKET.x + x, y: BASKET.top + 4, sx: 0.9, sy: 0.93, line: 6 })
}
export function drawBasket(b: Brush, x: number): void {
  b.lay(S.basket, C.straw, { x: BASKET.x + x, y: BASKET.top + 24 })
  for (let r = 0; r < 3; r++) for (let i = -2; i <= 2; i++) b.curve(BASKET.x + x + i * 48 - 16 + (r % 2) * 14, BASKET.top + 70 + r * 44, BASKET.x + x + i * 48 + (r % 2) * 14, BASKET.top + 80 + r * 44, BASKET.x + x + i * 48 + 16 + (r % 2) * 14, BASKET.top + 70 + r * 44, 6)
  b.lay(S.rim, C.red, { x: BASKET.x + x, y: BASKET.top + 24 })
}

/** The sun and the moon: one face that goes down and comes up as the other. `dark` is 0 by day and 1 by night. */
export function drawSky(b: Brush, dark: number, poke: number, t: number): void {
  const { pen } = b
  pen.save(); pen.beginPath(); pen.rect(WINDOW.x - WINDOW.w / 2 + 6, WINDOW.y - WINDOW.h / 2 + 6, WINDOW.w - 12, WINDOW.h - 12); pen.clip()
  const dip = poke > 0 ? Math.sin(Math.min(1, poke) * Math.PI) * 46 : 0
  const moon = dark > 0.5, gone = moon ? (1 - dark) * 2 : dark * 2
  const y = SUN.y + gone * 190 + (moon ? 0 : dip) + (moon ? -dip * 0.4 : 0), x = SUN.x
  if (!moon) for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 + t * 0.1; b.lay(S.ray, C.yellow, { x: x + Math.cos(a) * (SUN.r + 12), y: y + Math.sin(a) * (SUN.r + 12), rot: a + 1.571, line: 6 }) }
  b.lay(S.disc, moon ? C.white : C.yellow, { x, y, line: 8 })
  if (moon) { b.curve(x - 26, y - 6, x - 16, y + 6, x - 6, y - 6, 6); b.curve(x + 10, y - 6, x + 20, y + 6, x + 30, y - 6, 6); b.curve(x - 10, y + 24, x + 2, y + 32, x + 14, y + 24, 6) } else {
    const s = Math.sin(t * 0.7) * 5
    b.dot(x - 20 + s, y - 8, 6, 9, INK); b.dot(x + 20 + s, y - 8, 6, 9, INK); b.curve(x - 22 + s, y + 16, x + s, y + 34, x + 22 + s, y + 16, 6.5); b.dot(x - 36, y + 12, 9, 7, C.orange); b.dot(x + 36, y + 12, 9, 7, C.orange)
  }
  for (let i = 0; i < 7; i++) { const u = (t * 0.07 + i * 0.143) % 1; b.lay(S.flake, C.white, { x: WINDOW.x - 100 + ((i * 61) % 200) + Math.sin(t + i) * 10, y: WINDOW.y - 110 + u * 220, line: 0 }) }
  pen.restore()
}
/** The cat on the sill, who watches whatever is going on. */
export function drawCat(b: Brush, lookX: number, lookY: number, poke: number, t: number, wide: boolean): void {
  const x = WINDOW.x + 70, y = WINDOW.y + WINDOW.h / 2 - 34 - Math.abs(Math.sin(poke * 8)) * poke * 26
  b.curve(x + 44, y + 36, x + 104 + Math.sin(t * 1.7) * 12, y + 60, x + 84 + Math.sin(t * 1.7) * 22, y + 112, 13)
  b.lay(S.cat, INK, { x, y, line: 4 })
  for (const s of [-20, 20]) { b.dot(x + s, y - 2, wide ? 14 : 11, (t * 0.2) % 1 < 0.03 ? 2 : wide ? 15 : 11, C.yellow); b.dot(x + s + lookX * 5, y - 2 + lookY * 5, 5, 7, INK) }
  b.dot(x, y + 16, 5, 4, C.pink)
}
