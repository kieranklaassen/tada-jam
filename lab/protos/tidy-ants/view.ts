// The view: flat shapes from the snapshot, nothing else. It forwards no input
// and holds no state.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { COLOUR_HEX } from './sim.ts'
import type { TidySnapshot } from './sim.ts'

const INK = '#3a2f22'

export function draw(ctx: CanvasRenderingContext2D, snapshot: TidySnapshot): void {
  clear(ctx, '#bfe0ee')

  // The sand, seen from the side, with a few darker flecks to say so.
  const { sand } = snapshot
  rect(ctx, sand.x, sand.y, sand.w, sand.h, { fill: '#dcbf85', stroke: '#a88a52', width: 6 })
  for (let i = 0; i < 60; i++) {
    circle(ctx, sand.x + ((i * 397) % sand.w), sand.y + ((i * 211) % sand.h), 3, '#c9aa6c')
  }

  // Cups of beads, the shake button, and the tip-out button.
  for (const cup of snapshot.cups) {
    roundRect(ctx, cup.x, cup.y, cup.w, cup.h, 18, { fill: cup.colour ?? '#efe8d8', stroke: cup.selected ? INK : '#8a7f6a', width: cup.selected ? 8 : 3 })
    if (cup.colour === null) {
      COLOUR_HEX.slice(0, 4).forEach((hex, i) => circle(ctx, cup.x + 22 + i * 23, cup.y + 30, 9, hex))
    }
    label(ctx, cup.name, cup.x + cup.w / 2, cup.y + cup.h - 14, { align: 'center', size: 20, color: cup.colour === null ? INK : '#fff' })
  }
  for (const [button, text] of [[snapshot.shake, 'shake'], [snapshot.tip, 'tip out']] as const) {
    roundRect(ctx, button.x, button.y, button.w, button.h, 18, { fill: '#efe8d8', stroke: '#8a7f6a', width: 3 })
    label(ctx, text, button.x + button.w / 2, button.y + button.h / 2, { align: 'center', baseline: 'middle', size: 24 })
  }
  label(ctx, `in hand: ${snapshot.inHand}.  hold the sand to pour, tap it to plant a seed bead (tap a seed to lift it).`, 24, 114, { size: 17, color: INK })

  for (const b of snapshot.beads) {
    if (b.seed) {
      circle(ctx, b.x, b.y, 19, { fill: b.hex, stroke: INK, width: 5 })
      circle(ctx, b.x, b.y, 6, INK)
    } else circle(ctx, b.x, b.y, 15, { fill: b.hex, stroke: 'rgba(58,47,34,0.5)', width: 2 })
  }

  for (const a of snapshot.ants) {
    const len = Math.hypot(a.dx, a.dy) || 1
    const hx = a.x + (a.dx / len) * 13
    const hy = a.y + (a.dy / len) * 13
    line(ctx, a.x - (a.dx / len) * 12, a.y - (a.dy / len) * 12, a.x, a.y, '#4a2c18', 11)
    circle(ctx, hx, hy, 7, '#4a2c18')
    if (a.carry) circle(ctx, hx + (a.dx / len) * 10, hy + (a.dy / len) * 10 - 6, 9, { fill: a.carry, stroke: INK, width: 2 })
  }

  // Beads falling from a pouring finger.
  for (const t of snapshot.touches) {
    for (let k = 0; k < 3; k++) circle(ctx, t.x + (k - 1) * 12, t.y - 30 - ((snapshot.tick * 9 + k * 40) % 90), 6, '#ffffff99')
  }

  if (snapshot.hint) {
    const phase = (snapshot.tick % 30) / 30
    circle(ctx, snapshot.hint.x, snapshot.hint.y, 50 + phase * 40, { stroke: `rgba(58,47,34,${(1 - phase) * 0.7})`, width: 5 })
  }

  if (snapshot.cheer) label(ctx, 'tidy!', 590, 220, { align: 'center', size: 96, color: '#fff', weight: '800' })
  label(ctx, `tidy ${Math.round(snapshot.tidy * 100)}%`, 24, 806, { size: 20, color: INK })
}
