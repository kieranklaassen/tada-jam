// The view: flat shapes from the snapshot, nothing else. It holds no state, so
// the same snapshot always draws the same picture. Ugly on purpose.

import { circle, clear, label, line, roundRect } from '../../kit/draw.ts'
import { POND_R, SHORE, STALL_R } from './sim.ts'
import type { DawdleSnapshot } from './sim.ts'

const COLORS = ['#f2c14e', '#e8743b', '#5b9bd5']
const LETTERS = ['D', 'C', 'F']

export function draw(ctx: CanvasRenderingContext2D, s: DawdleSnapshot): void {
  clear(ctx, '#9ccf7a')

  if (s.pond) {
    circle(ctx, s.pond.x, s.pond.y, SHORE, { stroke: 'rgba(255,255,255,0.45)', width: 4 })
    circle(ctx, s.pond.x, s.pond.y, POND_R, { fill: s.phase === 'home' ? '#8fd0f0' : '#5fa8d3', stroke: '#3d7ea6', width: 6 })
    label(ctx, s.phase === 'home' ? 'home!' : 'pond', s.pond.x, s.pond.y, { align: 'center', baseline: 'middle', size: 34, color: '#ffffff' })
  }

  for (const f of s.flowers) {
    // The dawdler stalls inside the faint ring, once per visit while it is armed.
    circle(ctx, f.x, f.y, STALL_R, { stroke: f.armed ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)', width: 3 })
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      circle(ctx, f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20, 14, f.armed ? '#f07aa8' : '#c79aad')
    }
    circle(ctx, f.x, f.y, 10, '#fff2a8')
  }

  // The path the mother is heading along.
  line(ctx, s.mother.x, s.mother.y, s.goal.x, s.goal.y, 'rgba(255,255,255,0.5)', 4)
  circle(ctx, s.goal.x, s.goal.y, 12, { stroke: 'rgba(255,255,255,0.8)', width: 4 })

  // Back to front, so the front of the line is drawn on top.
  for (let slot = s.line.length - 1; slot >= 0; slot--) {
    const d = s.ducklings[s.line[slot]!]!
    const bob = d.stalled ? Math.sin(s.tick * 0.5) * 5 : d.peeping ? -8 : 0
    circle(ctx, d.x, d.y + bob, 24, { fill: COLORS[d.id], stroke: d.dashing ? '#2b2620' : d.hurrying ? '#c0392b' : '#7a6a2c', width: d.dashing ? 6 : 4 })
    label(ctx, LETTERS[d.id]!, d.x, d.y + bob, { align: 'center', baseline: 'middle', size: 22, color: '#2b2620' })
    label(ctx, slot + 1, d.x, d.y - 34, { align: 'center', size: 20, color: 'rgba(30,50,20,0.8)' })
    if (d.stalled) label(ctx, 'zzz', d.x + 26, d.y - 22, { size: 22, color: '#ffffff' })
  }

  circle(ctx, s.mother.x, s.mother.y, 40, { fill: '#fff3c4', stroke: '#8a6d1a', width: 6 })
  label(ctx, 'mum', s.mother.x, s.mother.y, { align: 'center', baseline: 'middle', size: 24, color: '#5b4a10' })

  if (s.hint) {
    const phase = (s.tick % 45) / 45
    const x = s.hint.from.x + (s.hint.to.x - s.hint.from.x) * phase
    const y = s.hint.from.y + (s.hint.to.y - s.hint.from.y) * phase
    line(ctx, s.hint.from.x, s.hint.from.y, s.hint.to.x, s.hint.to.y, 'rgba(255,255,255,0.35)', 6)
    circle(ctx, x, y, 22, { fill: 'rgba(255,255,255,0.8)' })
  }

  roundRect(ctx, 24, 20, 640, 46, 12, 'rgba(255,255,255,0.7)')
  label(ctx, s.pond ? 'Drag mum to the pond. Flowers slow the yellow one.' : 'Drag mum around. Flowers slow the yellow one.', 40, 52, { size: 24, color: '#33421f' })
  if (s.pond) label(ctx, `parades home ${s.round}`, 1140, 52, { align: 'right', size: 26, color: '#33421f' })
}
