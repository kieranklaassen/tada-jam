// The view: flat shapes from the snapshot, nothing else. Ugly on purpose.
// Nothing shows WHY the owl saw or missed a chick; the rules stay hidden.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { CHICK_R } from './sim.ts'
import type { OwlSnapshot } from './sim.ts'

const CHICK = ['#f2c531', '#8a5a34', '#9aa0a6']
const PATCH = ['#ecd98a', '#b58a5f', '#c4c8cc']
const OWL_BODY = ['#e4d2a4', '#5a3d28', '#f4f6fa']

export function draw(ctx: CanvasRenderingContext2D, s: OwlSnapshot): void {
  const dark = s.owl.phase === 'stare'
  clear(ctx, s.owl.phase === 'dawn' ? '#f8e7b8' : dark ? '#5d7a52' : '#7fa568')

  for (const [i, p] of s.layout.patches.entries()) {
    const shake = s.patchRustle[i]! > 0 ? Math.sin(s.tick * 1.5) * 4 : 0
    circle(ctx, p.x + shake, p.y, p.r, { fill: PATCH[p.colour]!, stroke: '#00000022', width: 3 })
  }
  for (const [i, r] of s.layout.reeds.entries()) {
    const shake = s.reedRustle[i]! > 0 ? Math.sin(s.tick * 1.5) * 5 : 0
    rect(ctx, r.x, r.y, r.w, r.h, '#3f7a3a')
    for (let x = r.x + 10; x < r.x + r.w - 6; x += 18) line(ctx, x, r.y + r.h, x + shake + 4, r.y - 26, '#2c5a2a', 6)
  }
  roundRect(ctx, s.nest.x, s.nest.y, s.nest.w, s.nest.h, 30, { fill: '#c9a26a', stroke: '#7a5a34', width: 5 })

  // The owl, its gaze, and its eyes: wide before a stare, narrow before a glance.
  const { perch } = s.layout
  const { owl } = s
  if (owl.phase === 'glance' || owl.phase === 'stare') {
    ctx.beginPath()
    ctx.moveTo(perch.x, perch.y)
    for (const a of [owl.angle - owl.half, owl.angle + owl.half]) ctx.lineTo(perch.x + Math.sin(a) * 1500, perch.y + Math.cos(a) * 1500)
    ctx.closePath()
    ctx.fillStyle = s.verdict === 'caught' ? 'rgba(220,60,40,0.30)' : dark ? 'rgba(255,190,60,0.32)' : 'rgba(255,255,220,0.30)'
    ctx.fill()
  }
  // A swoop dives at the chick and climbs back: sin(t * PI) runs 0, 1, 0.
  const target = owl.swoop ? s.chicks[owl.swoop.chick]! : null
  const dive = owl.swoop ? Math.sin(owl.swoop.t * Math.PI) * 0.9 : 0
  const owlX = target ? perch.x + (target.x - perch.x) * dive : perch.x
  const owlY = target ? perch.y + (target.y - perch.y) * dive : perch.y
  // The three owls look different: pale barn, dark tawny (with tufts), white snowy.
  circle(ctx, owlX, owlY, 46, { fill: OWL_BODY[s.layout.kind]!, stroke: '#2b2620', width: 4 })
  if (s.layout.kind === 1) for (const dx of [-30, 30]) line(ctx, owlX + dx, owlY - 34, owlX + dx * 1.2, owlY - 62, '#2b2620', 8)
  const wide = owl.phase === 'stare' || (owl.phase === 'rest' && owl.upcoming === 'stare')
  for (const dx of [-17, 17]) {
    circle(ctx, owlX + dx, owlY - 6, wide ? 16 : 9, { fill: '#fff8d8', stroke: '#2b2620', width: 3 })
    circle(ctx, owlX + dx, owlY - 6, wide ? 6 : 4, '#2b2620')
  }

  for (const [i, c] of s.chicks.entries()) {
    const hop = !c.inField && c.flash === 'none' ? Math.abs(Math.sin((s.tick + i * 11) / 9)) * 6 : 0
    const y = c.y - hop - (c.held ? 12 : 0)
    circle(ctx, c.x, y, CHICK_R, { fill: CHICK[c.colour]!, stroke: c.moving && c.inField ? '#e44' : '#2b2620', width: 4 })
    circle(ctx, c.x - 12, y - 8, 4, '#2b2620')
    circle(ctx, c.x + 12, y - 8, 4, '#2b2620')
    if (c.flash === 'safe') circle(ctx, c.x, y, 50 + c.flashT / 2, { stroke: '#2ecc71', width: 6 })
    if (c.flash === 'caught') label(ctx, '!', c.x, y - 52, { align: 'center', size: 44, color: '#d0321f' })
    if (c.flash === 'joy') label(ctx, 'peep', c.x, y - 50, { align: 'center', size: 26, color: '#7a4a10' })
  }

  if (s.hint) {
    const { fromX, fromY, toX, toY, t } = s.hint
    line(ctx, fromX, fromY, toX, toY, 'rgba(255,255,255,0.5)', 4)
    circle(ctx, fromX + (toX - fromX) * t, fromY + (toY - fromY) * t, 36, { stroke: 'rgba(255,255,255,0.9)', width: 5 })
  }
  label(ctx, 'Carry a chick out and let go. What will the owl see?', 30, 806 - 130, { size: 24, color: '#1f2a1c' })
  if (s.dawns !== null) label(ctx, `dawns ${s.dawns}`, 1150, 36, { align: 'right', size: 26, color: '#1f2a1c' })
}
