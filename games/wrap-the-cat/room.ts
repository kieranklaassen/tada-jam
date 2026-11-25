import { BACKDROP } from './config'
import { CREAM, crepe, darker, fringe, frilled, lighter, poly, ribs, rosette, wire, type Ctx, type P } from './crepe'
import { DOOR } from './layout'
import { makeRng } from './rng'

// The room that stands still, painted once for a size of the surface: crepe on
// the wall, on the floor and round the window, wire for what holds it up.

const WALL = BACKDROP
const FLOORING = '#cdaa80'
const SKIRT = 452

export const WINDOW = { x: 528, y: 62, w: 130, h: 166 }

export function paintRoom(c: Ctx, x: number, y: number, w: number, h: number): void {
  const r = makeRng(41)
  const right = x + w, bottom = y + h
  const rect = (x0: number, y0: number, w0: number, h0: number, color: string, along: number, gap: number, strength = 1) => {
    c.save()
    c.beginPath()
    c.rect(x0, y0, w0, h0)
    c.fillStyle = color
    c.fill()
    c.clip()
    ribs(c, r, { x: x0, y: y0, w: w0, h: h0 }, color, along, gap, strength)
    c.restore()
  }
  rect(x, y, w, SKIRT - y, WALL, Math.PI / 2, 7, 0.75)
  // Pleats in the wall paper.
  for (let px = Math.floor(x / 74) * 74; px < right; px += 74) {
    c.fillStyle = 'rgba(44,58,78,0.13)'
    c.fillRect(px, y, 16, SKIRT - y)
    c.fillStyle = 'rgba(232,240,246,0.1)'
    c.fillRect(px + 16, y, 10, SKIRT - y)
  }
  rect(x, SKIRT - 34, w, 46, '#6b7f92', 0, 5)
  rect(x, SKIRT + 10, w, bottom - SKIRT, FLOORING, 0, 6, 0.8)
  c.fillStyle = 'rgba(80,46,40,0.22)'
  c.fillRect(x, SKIRT + 10, w, 14)
  // A round rug.
  crepe(c, r, frilled(590, 680, 560, 128, 44, 7), { x: 20, y: 540, w: 1140, h: 290 }, '#e4d5b4', { along: 0, gap: 6, strength: 0.7 })
  for (const k of [0.92, 0.84]) {
    c.beginPath()
    frilled(590, 680, 560 * k, 128 * k, 44, 5)(c)
    c.strokeStyle = k > 0.9 ? '#b58a76' : '#8ea58f'
    c.lineWidth = 6
    c.globalAlpha = 0.6
    c.stroke()
    c.globalAlpha = 1
  }
  // The window, with a snowy hill in it.
  const f = WINDOW
  c.fillStyle = '#3f5a7a'
  c.fillRect(f.x, f.y, f.w, f.h)
  c.save()
  c.beginPath()
  c.rect(f.x, f.y, f.w, f.h)
  c.clip()
  crepe(c, r, frilled(f.x + 40, f.y + f.h + 30, 90, 80, 12, 3), { x: f.x - 60, y: f.y + 60, w: 210, h: 140 }, '#dfe8ee')
  crepe(c, r, frilled(f.x + 120, f.y + f.h + 34, 70, 70, 10, 3), { x: f.x + 40, y: f.y + 70, w: 160, h: 140 }, '#eef3f5')
  c.restore()
  wire(c, [[f.x, f.y], [f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [f.x, f.y + f.h]], 15, '#a4714e', true)
  wire(c, [[f.x + f.w / 2, f.y], [f.x + f.w / 2, f.y + f.h]], 8, '#a4714e')
  for (const s of [-1, 1]) {
    const cx = s < 0 ? f.x - 6 : f.x + f.w + 6
    crepe(c, r, poly(cx - 20, f.y - 18, cx + 20, f.y - 18, cx + s * 24, f.y + f.h + 22, cx - s * 8, f.y + f.h + 18), { x: cx - 30, y: f.y - 20, w: 60, h: f.h + 50 }, '#b56f7c')
  }
  fringe(c, r, [f.x - 30, f.y - 22], [f.x + f.w + 30, f.y - 22], 34, '#c98590', { w: 13 })
  // A garland of frills along the top, on its wire.
  for (const [a, b] of [[x - 20, 330], [330, 760], [760, right + 20]] as const) {
    const n = Math.max(3, Math.round((b - a) / 34))
    const pts: P[] = Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [a + (b - a) * t, 16 + Math.sin(t * Math.PI) * 26] as const })
    wire(c, pts, 7)
    pts.forEach((p, i) => { if (i % 2) rosette(c, r, p[0], p[1], 19, 17, [CREAM, '#9db08a', '#d8a3a8'][i % 3], 2) ; else fringe(c, r, [p[0] - 14, p[1]], [p[0] + 14, p[1]], 22, '#5f8a6a', { w: 8, spread: -0.6 }) })
  }
  // The door stands half open on a warm hall.
  const d = DOOR
  c.fillStyle = '#e9b66f'
  c.fillRect(d.x, d.y, d.w + 400, d.h)
  c.save()
  c.beginPath()
  c.rect(d.x, d.y, d.w, d.h)
  c.clip()
  ribs(c, r, d, '#e9b66f', Math.PI / 2, 6)
  c.restore()
  c.fillStyle = 'rgba(120,60,20,0.2)'
  c.fillRect(d.x, d.y, 18, d.h)
  const leaf = poly(1152, d.y, right + 30, d.y - 14, right + 30, d.y + d.h + 60, 1152, d.y + d.h)
  crepe(c, r, leaf, { x: 1150, y: d.y - 20, w: Math.max(40, right - 1120), h: d.h + 90 }, '#5c7d72')
  wire(c, [[d.x - 4, d.y + d.h + 6], [d.x - 4, d.y - 6], [right + 30, d.y - 6]], 18, '#a4714e')
  rosette(c, r, 1163, d.y + 200, 11, 11, lighter('#c9a13f', 0.2), 2, darker('#c9a13f', 0.5))
}
