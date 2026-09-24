// The view: flat shapes from the snapshot, nothing else. It forwards no input
// (the shell maps pointer events to logical coordinates and calls sim.pointer)
// and holds no state. Words and numbers are allowed in the lab.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { GROUND_Y, HILL_START, HILL_TOP, ISLAND, LEGS_PAD, LETGO_PAD, PIVOT, POND_START, SAND_END } from './sim.ts'
import type { SwingSnapshot } from './sim.ts'

const PLACE_WORDS = { sand: 'sandpit', lawn: 'lawn', pond: 'splash! pond', hill: 'the far hill!', cloud: 'toes in clouds!' }

export function draw(ctx: CanvasRenderingContext2D, s: SwingSnapshot): void {
  clear(ctx, '#cfe8f7')

  // Ground, in the order the rider meets it: sand, lawn, pond, hill.
  rect(ctx, 0, GROUND_Y, 1180, 90, '#8cc46a')
  rect(ctx, 0, GROUND_Y, SAND_END, 90, '#e8d6a0')
  rect(ctx, POND_START, GROUND_Y, HILL_START - POND_START, 90, '#5aa9d6')
  roundRect(ctx, HILL_START, HILL_TOP, 180, 200, 50, '#5f9e4a')
  label(ctx, 'pond', (POND_START + HILL_START) / 2, GROUND_Y + 50, { align: 'center', color: '#2d6f99' })
  label(ctx, 'far hill', HILL_START + 90, HILL_TOP + 50, { align: 'center', color: '#2f5f26' })
  for (let i = 0; i < (s.flags ?? 0) && i < 8; i++) {
    line(ctx, HILL_START + 24 + i * 18, HILL_TOP - 34, HILL_START + 24 + i * 18, HILL_TOP + 6, '#5d4a2a', 3)
    rect(ctx, HILL_START + 24 + i * 18, HILL_TOP - 34, 14, 12, '#e4572e')
  }

  // Sky clouds, and the island (a bigger cloud with a flat top) once it opens.
  for (const [x, y] of [[640, 110], [1040, 150], [180, 190]] as const) circle(ctx, x, y, 42, '#f4faff')
  if (s.island) {
    const w = ISLAND.x1 - ISLAND.x0
    roundRect(ctx, ISLAND.x0, ISLAND.top, w, 46, 23, { fill: '#ffffff', stroke: '#9cc3dc', width: 3 })
    label(ctx, 'cloud island', ISLAND.x0 + w / 2, ISLAND.top + 76, { align: 'center', size: 22, color: '#5f8aa5' })
  }

  // The swing: frame, rope, seat.
  rect(ctx, PIVOT.x - 70, PIVOT.y - 16, 140, 14, '#7a5a34')
  line(ctx, PIVOT.x, PIVOT.y, s.seat.x, s.seat.y, '#7a5a34', 5)
  roundRect(ctx, s.seat.x - 34, s.seat.y - 6, 68, 12, 5, '#a9793f')

  // Where the last flight went.
  s.trail.forEach(([x, y], i) => i % 3 === 0 && circle(ctx, x, y, 4, 'rgba(43,38,32,0.45)'))

  // The rider: legs stretch forward along the arc while the legs pad is held.
  const r = s.rider
  if (s.riding) {
    const fx = Math.cos(s.theta)
    const fy = -Math.sin(s.theta)
    line(ctx, r.x, r.y + 6, r.x - Math.sin(s.theta) * 34 + fx * 46 * s.legs, r.y + Math.cos(s.theta) * 34 + fy * 46 * s.legs, '#2b2620', 9)
  }
  circle(ctx, r.x, r.y - 20, 26, { fill: '#e4572e', stroke: '#2b2620', width: 4 })
  if (s.mode === 'land' && s.landed) {
    label(ctx, PLACE_WORDS[s.landed.cls], s.landed.x, s.landed.y - 70, { align: 'center', size: 34 })
    if (s.landed.cls === 'pond') circle(ctx, s.landed.x, GROUND_Y, 50, { stroke: '#ffffff', width: 6 })
  }

  // The two pads. A hint makes the legs pad glow exactly while the seat goes forward.
  const glow = (pad: 'legs' | 'letgo') => (s.hint?.pad === pad && s.hint.on ? { stroke: '#f2b134', width: 12 } : { stroke: '#8a7f6a', width: 4 })
  roundRect(ctx, LEGS_PAD.x, LEGS_PAD.y, LEGS_PAD.w, LEGS_PAD.h, 30, { fill: s.held ? '#a9d8b8' : '#e4dccb', ...glow('legs') })
  label(ctx, 'HOLD: legs out', LEGS_PAD.x + LEGS_PAD.w / 2, LEGS_PAD.y + 88, { align: 'center', size: 30 })
  label(ctx, 'while seat swings forward', LEGS_PAD.x + LEGS_PAD.w / 2, LEGS_PAD.y + 126, { align: 'center', size: 20, color: '#5d5443' })
  roundRect(ctx, LETGO_PAD.x, LETGO_PAD.y, LETGO_PAD.w, LETGO_PAD.h, 30, { fill: '#f0d4d0', ...glow('letgo') })
  label(ctx, 'TAP: let go', LETGO_PAD.x + LETGO_PAD.w / 2, LETGO_PAD.y + 88, { align: 'center', size: 30 })
  label(ctx, 'or tap the rider', LETGO_PAD.x + LETGO_PAD.w / 2, LETGO_PAD.y + 126, { align: 'center', size: 20, color: '#5d5443' })

  // How wide the swing is, and the last place the rider came down.
  rect(ctx, 40, 40, 300, 22, '#e4dccb')
  rect(ctx, 40, 40, 300 * Math.min(1, s.amp / 1.3), 22, '#3fa66b')
  label(ctx, 'swing width', 40, 92, { size: 22, color: '#5d5443' })
  label(ctx, s.lastOutcome === 'none' ? 'flights 0' : `flights ${s.flights}   last: ${s.lastOutcome}`, 40, 124, { size: 22, color: '#5d5443' })
}
