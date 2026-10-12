import type { Pen } from './pen'

// Helpers for what is printed on a room's card, in colour: flat shapes that
// never move. Nothing printed is a letter, a numeral or a sign, and nothing
// is laid out as an even row of equal marks, a level bar or a cross.

export function fill(p: Pen, color: string, shape: () => void): void {
  p.color = color
  shape()
}

/** A rectangle with its corners rounded by about half of `r`. */
export function rr(p: Pen, x: number, y: number, w: number, h: number, r: number): void {
  p.blob([x + r, y, x + w - r, y, x + w, y, x + w, y + r, x + w, y + h - r, x + w, y + h, x + w - r, y + h, x + r, y + h, x, y + h, x, y + h - r, x, y + r, x, y])
}

export function box(p: Pen, x: number, y: number, w: number, h: number): void {
  p.poly([x, y, x + w, y, x + w, y + h, x, y + h])
}

/** A small stream of numbers for where print is scattered, the same every time. */
export function scatter(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A wall down to `floorY` and a floor below it, from `x0` to `x1`, with a skirting line between. */
export function wallAndFloor(p: Pen, x0: number, x1: number, top: number, floorY: number, bottom: number, wall: string, floor: string, skirt: string): void {
  fill(p, wall, () => box(p, x0, top, x1 - x0, floorY - top))
  fill(p, floor, () => box(p, x0, floorY, x1 - x0, bottom - floorY))
  fill(p, skirt, () => box(p, x0, floorY - 10, x1 - x0, 14))
}

/** Lines that wave down a wall, none of them straight, at uneven spacing. */
export function wavyStripes(p: Pen, color: string, x0: number, x1: number, top: number, bottom: number, gap: number, width: number, seed: number): void {
  const next = scatter(seed)
  fill(p, color, () => {
    for (let x = x0 + gap * 0.4; x < x1; x += gap * (0.8 + next() * 0.5)) {
      const sway = 6 + next() * 6, h = bottom - top
      p.line([x, top, x + sway, top + h * 0.26, x - sway, top + h * 0.52, x + sway, top + h * 0.78, x, bottom], width * (0.7 + next() * 0.6))
    }
  })
}

/** Lines that wave along a floor, at uneven spacing. */
export function wavyBoards(p: Pen, color: string, x0: number, x1: number, top: number, bottom: number, gap: number, seed: number): void {
  const next = scatter(seed)
  fill(p, color, () => {
    for (let y = top + gap * (0.7 + next() * 0.4); y < bottom - 6; y += gap * (0.8 + next() * 0.5)) {
      const w = x1 - x0
      p.line([x0, y, x0 + w * 0.3, y + 3 - next() * 6, x0 + w * 0.66, y - 3 + next() * 6, x1, y + 2], 3)
    }
  })
}

/** Spots scattered over an area, each of its own size: a wallpaper of blobs, never a grid. */
export function spots(p: Pen, color: string, x0: number, y0: number, x1: number, y1: number, count: number, r: number, seed: number): void {
  const next = scatter(seed)
  fill(p, color, () => {
    for (let i = 0; i < count; i++) {
      const s = r * (0.6 + next() * 0.9)
      p.ell(x0 + next() * (x1 - x0), y0 + next() * (y1 - y0), s, s * (0.7 + next() * 0.5), next() * 3)
    }
  })
}

/** A picture frame with its inside left pale. Returns nothing: the room draws what is in it. */
export function frame(p: Pen, x: number, y: number, w: number, h: number, color: string): void {
  fill(p, color, () => rr(p, x, y, w, h, 16))
  fill(p, '#fffaf0', () => rr(p, x + 11, y + 11, w - 22, h - 22, 10))
}

/** A shelf on two brackets. */
export function shelf(p: Pen, x: number, y: number, w: number, color = '#c9803a'): void {
  fill(p, color, () => {
    rr(p, x, y, w, 14, 8)
    p.poly([x + 20, y + 12, x + 40, y + 12, x + 20, y + 38])
    p.poly([x + w - 40, y + 12, x + w - 20, y + 12, x + w - 20, y + 38])
  })
}

/** A round rug. */
export function rug(p: Pen, x: number, y: number, rx: number, ry: number, rim: string, inside: string): void {
  fill(p, rim, () => p.ell(x, y, rx, ry))
  fill(p, inside, () => p.ell(x, y, rx - 16, ry - 12))
}
