// The view: flat shapes from the snapshot, nothing else. The hidden layout is
// drawn only once the cloth is lifted. Words are allowed in the lab.

import { circle, clear, label, roundRect } from '../../kit/draw.ts'
import { CLOTH, LIFT_BTN, POLE_BTN, TOKEN_SLOTS } from './sim.ts'
import type { ClothSnapshot } from './sim.ts'

const KIND_COLOR = ['#d64545', '#3b6fd6', '#8b8f98']
const KIND_LETTER = ['N', 'S', 'Fe']
const POLE_COLOR = { '1': '#d64545', '-1': '#3b6fd6' } as const

function token(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number, r: number, stroke?: string) {
  circle(ctx, x, y, r, { fill: KIND_COLOR[kind]!, stroke, width: 6 })
  label(ctx, KIND_LETTER[kind]!, x, y, { align: 'center', baseline: 'middle', size: r * 0.9, color: '#fff' })
}

export function draw(ctx: CanvasRenderingContext2D, s: ClothSnapshot): void {
  clear(ctx, '#2f3a44')
  roundRect(ctx, CLOTH.x, CLOTH.y, CLOTH.w, CLOTH.h, 24, { fill: s.revealed ? '#cfc2a4' : '#efe6d2', stroke: '#8a7f6a', width: 4 })

  if (s.revealed) {
    for (const it of s.items) {
      circle(ctx, it.x, it.y, it.range, { stroke: 'rgba(0,0,0,0.12)', width: 3 })
      token(ctx, it.x, it.y, it.kind, 34, it.found ? '#2f9e57' : '#c0392b')
    }
  }
  for (let i = 0; i < s.beads.length; i += 2) circle(ctx, s.beads[i]!, s.beads[i + 1]!, 5.5, '#4a4f57')

  const poleColor = POLE_COLOR[String(s.pole) as '1' | '-1']
  if (!s.revealed) {
    circle(ctx, s.hand.x, s.hand.y, s.hand.zone, { stroke: 'rgba(60,60,60,0.25)', width: 3 })
    circle(ctx, s.hand.x, s.hand.y, 30, { fill: poleColor, stroke: s.hand.snapped ? '#2b2620' : '#fff', width: 6 })
    label(ctx, s.pole === 1 ? 'N' : 'S', s.hand.x, s.hand.y, { align: 'center', baseline: 'middle', size: 30, color: '#fff' })
  }
  for (const m of s.markers) {
    token(ctx, m.x, m.y, m.kind, 26, m.verdict === 'ok' ? '#2f9e57' : m.verdict === 'wrong' ? '#c0392b' : '#fff')
  }

  // The tray: pole button, three tokens, lift or next-cloth button.
  roundRect(ctx, POLE_BTN.x, POLE_BTN.y, POLE_BTN.w, POLE_BTN.h, 28, { fill: poleColor, stroke: '#fff', width: 5 })
  label(ctx, s.pole === 1 ? 'N' : 'S', POLE_BTN.x + POLE_BTN.w / 2, POLE_BTN.y + 78, { align: 'center', baseline: 'middle', size: 90, color: '#fff' })
  label(ctx, 'tap: flip pole', POLE_BTN.x + POLE_BTN.w / 2, POLE_BTN.y + POLE_BTN.h + 24, { align: 'center', size: 20, color: '#cfd6dc' })
  TOKEN_SLOTS.forEach((slot, k) => token(ctx, slot.x + slot.w / 2, slot.y + slot.h / 2, k, 46))
  label(ctx, 'drag a guess onto the cloth', 1070, 650, { align: 'center', size: 17, color: '#cfd6dc' })
  roundRect(ctx, LIFT_BTN.x, LIFT_BTN.y, LIFT_BTN.w, LIFT_BTN.h, 28, { fill: '#f2b134', stroke: '#fff', width: 5 })
  label(ctx, s.revealed ? 'new cloth' : 'lift cloth', LIFT_BTN.x + LIFT_BTN.w / 2, LIFT_BTN.y + LIFT_BTN.h / 2, { align: 'center', baseline: 'middle', size: 30, color: '#2b2620' })

  for (const c of s.carrying) token(ctx, c.x, c.y, c.kind, 40, '#fff')
  if (s.hint) {
    const t = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 60 + t * 40, { stroke: `rgba(255,255,255,${(1 - t) * 0.8})`, width: 5 })
  }

  const line = s.revealed ? `cloth ${s.cloth}: ${s.verdict}` : 'sweep the magnet over the cloth. Beads clump toward it or ring away.'
  label(ctx, line, 40, 806, { size: 22, color: '#5d5443' })
  if (s.score !== null) label(ctx, `found ${s.score}`, 1070, 806, { align: 'center', size: 22, color: '#f2b134' })
}
