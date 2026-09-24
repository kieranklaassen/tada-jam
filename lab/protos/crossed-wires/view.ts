// The view: flat shapes from the snapshot, nothing else. No input, no state.
// Words are allowed in the lab, so gates are labelled as well as shaped.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { DECK_Y, FAR_X, HINGE_X, LANE_Y, PLATE_CX } from './sim.ts'
import type { CrossedWiresSnapshot, GateType } from './sim.ts'

const INK = '#2b2620'
const ON = '#e7a70c'
const OFF = '#9a948a'
const GLYPH: Record<GateType, string> = { '': 'tap', not: 'NOT', both: 'BOTH', either: 'EITHER', 'delay-s': 'DELAY', 'delay-l': 'LONG DELAY' }
const FILL: Record<GateType, string> = { '': '#efe9dc', not: '#f3c9c0', both: '#c6dcf2', either: '#cfe8cf', 'delay-s': '#f0e2a8', 'delay-l': '#e2cf86' }

function curve(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number, dash: number[] = []): void {
  const pull = Math.max(40, Math.abs(x2 - x1) * 0.45)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.bezierCurveTo(x1 + pull, y1, x2 - pull, y2, x2, y2)
  ctx.setLineDash(dash)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
  ctx.setLineDash([])
}

export function draw(ctx: CanvasRenderingContext2D, s: CrossedWiresSnapshot): void {
  clear(ctx, '#f4efe3')
  label(ctx, 'drag from a dot to an input. tap a grey box to seat a gate, tap a beetle to stop it. let the traveler cross.', 40, 30, { size: 19, color: '#6b6355', weight: '500' })

  // Beetle lanes and plates.
  s.lanes.forEach((l, i) => {
    roundRect(ctx, 50, LANE_Y[i]! - 42, 330, 84, 20, '#e6dcc6')
    roundRect(ctx, PLATE_CX - 45, LANE_Y[i]! - 30, 90, 60, 12, { fill: l.pressed ? ON : '#c9bfa6', stroke: INK, width: 3 })
    line(ctx, PLATE_CX + 45, l.y, l.out.x, l.out.y, OFF, 4)
    circle(ctx, l.x, l.y, 24, { fill: l.held ? '#5b8a3a' : '#3d5a2a', stroke: l.rest ? '#c0392b' : undefined, width: 5 })
    circle(ctx, l.x + 12, l.y - 6, 5, '#f4efe3')
    circle(ctx, l.out.x, l.out.y, 20, { fill: l.pressed ? ON : '#fff', stroke: INK, width: 4 })
  })

  // Sockets and their gates.
  for (const k of s.sockets) {
    const { x, y, w, h } = k.rect
    roundRect(ctx, x, y, w, h, 16, { fill: FILL[k.type], stroke: k.type === '' ? '#b9b09c' : INK, width: k.type === '' ? 2 : 4 })
    label(ctx, GLYPH[k.type], x + w / 2, y + h / 2, { align: 'center', baseline: 'middle', size: k.type === '' ? 20 : 22, color: k.type === '' ? '#b9b09c' : INK })
    for (const p of k.ins) circle(ctx, p.x, p.y, 14, { fill: '#fff', stroke: INK, width: 3 })
    if (k.out) circle(ctx, k.out.x, k.out.y, 20, { fill: k.on ? ON : '#fff', stroke: INK, width: 4 })
  }

  // Lamps and the bridge box.
  for (const k of s.sinks) {
    const { x, y, w, h } = k.rect
    roundRect(ctx, x, y, w, h, 16, { fill: '#efe9dc', stroke: '#b9b09c', width: 2 })
    circle(ctx, k.port.x, k.port.y, 14, { fill: '#fff', stroke: INK, width: 3 })
    if (k.bridge) label(ctx, 'bridge', x + w / 2 + 6, y + h / 2, { align: 'center', baseline: 'middle', size: 22 })
    else circle(ctx, x + w / 2 + 6, y + h / 2, 38, { fill: k.lit ? '#ffd84d' : '#d8d2c4', stroke: INK, width: 4 })
    label(ctx, k.cls, x + w / 2, y + h + 20, { align: 'center', size: 17, color: '#6b6355', weight: '500' })
  }

  // Wires on top, then the ones being dragged.
  for (const w of s.wires) curve(ctx, w.x1, w.y1, w.x2, w.y2, w.on ? ON : OFF, w.on ? 6 : 4)
  for (const d of s.dragging) curve(ctx, d.x1, d.y1, d.x2, d.y2, INK, 4, [10, 8])

  // The moat, the deck, and the traveler.
  rect(ctx, 40, DECK_Y, HINGE_X - 40, 130, '#c9b48a')
  rect(ctx, FAR_X, DECK_Y, 260, 130, '#c9b48a')
  rect(ctx, HINGE_X, DECK_Y + 30, FAR_X - HINGE_X, 100, '#7fb1d6')
  const angle = -(1 - s.bridge) * 1.4
  line(ctx, HINGE_X, DECK_Y, HINGE_X + (FAR_X - HINGE_X) * Math.cos(angle), DECK_Y + (FAR_X - HINGE_X) * Math.sin(angle), '#7a5a2c', 16)
  circle(ctx, s.traveler.x, s.traveler.y, 20, { fill: s.traveler.dir > 0 ? '#c0392b' : '#2c6fbb', stroke: INK, width: 3 })
  label(ctx, `crossed ${s.crossings}`, 60, 815, { size: 20, color: '#6b6355' })

  if (s.stamps) {
    label(ctx, 'stamps', 930, 745, { size: 18, color: '#6b6355' })
    ;['buzz', 'blink', 'beat', 'cross'].forEach((name, i) => {
      const got = s.stamps!.includes(name)
      circle(ctx, 950 + i * 66, 785, 26, { fill: got ? ON : '#e6dcc6', stroke: INK, width: 3 })
      label(ctx, name, 950 + i * 66, 785, { align: 'center', baseline: 'middle', size: 14, color: got ? INK : '#9a948a' })
    })
  }

  // The idle hint pulses on the tick clock, not a wall clock.
  if (s.hint) {
    const phase = (s.tick % 30) / 30
    const ring = `rgba(43,38,32,${1 - phase})`
    if (s.hint.kind === 'wire') {
      curve(ctx, s.hint.x1, s.hint.y1, s.hint.x2, s.hint.y2, 'rgba(43,38,32,0.35)', 8, [4, 12])
      circle(ctx, s.hint.x1, s.hint.y1, 30 + phase * 24, { stroke: ring, width: 4 })
    } else circle(ctx, s.hint.x, s.hint.y, 50 + phase * 30, { stroke: ring, width: 5 })
  }
}
