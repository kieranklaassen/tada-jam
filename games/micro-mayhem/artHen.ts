import type { Pen } from './pen'

// The hen by day, large: on her nest, in the bath and at the table. She is
// drawn about the middle of her body, facing left, and a room places, scales
// and mirrors her.

const D = Math.PI / 180

export type HenPose = {
  /** Where her head is, about the middle of her body. */
  head: readonly [number, number]
  eye: 'shut' | 'wide' | 'half' | 'cross'
  beak: 'shut' | 'open'
  /** Every feather stands out. */
  feathers?: boolean
  wing?: 'folded' | 'up' | 'over'
  legs?: boolean
  /** A shower cap in place of her comb. */
  cap?: 'on' | 'down'
  /** The chick stands on her head. */
  chick?: 'stand' | 'hop'
  big?: boolean
}

export function chick(p: Pen, x: number, y: number, hop = false): void {
  const lift = hop ? -16 : 0
  p.ell(x, y + lift, 15, 13)
  p.ell(x - 8, y - 15 + lift, 11, 10)
  p.poly([x - 17, y - 18 + lift, x - 28, y - 14 + lift, x - 17, y - 10 + lift])
  if (hop) { p.ell(x + 15, y - 6 + lift, 9, 4, -0.7); p.ell(x - 6, y + 22, 6, 3); p.ell(x + 10, y + 22, 6, 3) }
  else { p.line([x - 5, y + 11, x - 6, y + 19], 3); p.line([x + 6, y + 11, x + 7, y + 19], 3) }
  p.cut(() => p.ell(x - 11, y - 17 + lift, 2.5, 2.5))
}

function henHead(p: Pen, o: HenPose): void {
  const [x, y] = o.head
  if (o.cap) {
    // A puffed bonnet with a frilled rim. Pulled down, it covers her eye.
    const down = o.cap === 'down' ? 16 : 0
    p.blob([x - 34, y - 8 + down, x - 36, y - 40 + down, x, y - 56 + down, x + 38, y - 40 + down, x + 36, y - 8 + down])
    for (const dx of [-30, -15, 0, 15, 30]) p.ell(x + dx, y - 6 + down, 10, 7)
  } else {
    for (const [dx, dy] of [[-8, -22], [4, -27], [16, -22]]) p.ell(x + dx, y + dy, 8, 11)
  }
  p.ell(x, y, 27, 25)
  if (o.beak === 'open') {
    p.poly([x - 24, y - 8, x - 52, y - 14, x - 26, y + 2])
    p.poly([x - 24, y + 6, x - 48, y + 18, x - 22, y + 14])
  } else p.poly([x - 24, y - 6, x - 50, y + 3, x - 24, y + 10])
  p.ell(x - 14, y + 26, 7, 12)
  if (o.cap === 'down') return
  p.cut(() => {
    if (o.eye === 'shut') p.line([x - 14, y - 6, x - 6, y, x + 2, y - 6], 4)
    else if (o.eye === 'half') p.ell(x - 6, y - 2, 9, 6)
    else p.ell(x - 6, y - 5, 11, 11)
  })
  if (o.eye === 'wide') p.ell(x - 7, y - 5, 4, 4)
  else if (o.eye === 'cross') p.ell(x - 11, y - 2, 4, 4)
  else if (o.eye === 'half') p.ell(x - 7, y - 1, 4, 3)
}

/** The hen about the middle of her body. */
export function hen(p: Pen, o: HenPose): void {
  const rx = o.big ? 70 : 62, ry = o.big ? 58 : 50
  const [hx, hy] = o.head
  if (o.feathers) {
    for (let i = 0; i < 9; i++) {
      const a = (-150 + i * 37) * D
      p.ell(Math.cos(a) * (rx + 12), Math.sin(a) * (ry + 10), 20, 9, a)
    }
  }
  for (const turn of [-64, -40, -16]) p.ell(58 + turn * -0.1, -34, 13, 40, turn * -D)
  if (o.legs) {
    for (const dx of [-24, 22]) {
      p.line([dx, ry - 8, dx, ry + 26], 7)
      p.line([dx - 14, ry + 34, dx, ry + 24, dx + 14, ry + 34], 6)
    }
  }
  p.ell(0, 0, rx, ry)
  p.line([-30, -20, hx + 4, hy + 14], 30)
  p.cut(() => {
    if (o.wing !== 'up' && o.wing !== 'over') p.line([-20, -12, 22, 22, 46, -14], 5)
  })
  henHead(p, o)
  if (o.wing === 'up') p.blob([10, -30, 30, -84, 62, -96, 72, -70, 50, -30])
  else if (o.wing === 'over') p.ell(hx - 6, hy - 4, 36, 17, -24 * D)
  if (o.chick) chick(p, hx + 6, hy - 46, o.chick === 'hop')
}
