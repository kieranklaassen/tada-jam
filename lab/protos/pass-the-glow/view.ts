// The view: flat shapes from the snapshot, nothing else. Ugly on purpose. The
// glow is the big yellow halo; a ring means "cannot be tagged right now".

import { circle, clear, label, line } from '../../kit/draw.ts'
import type { Kind, PassSnapshot } from './sim.ts'

const COLORS: Record<Kind, string> = { hare: '#c98b4a', tortoise: '#5a9e6f', magpie: '#f2f2f7', mouse: '#a3a3b3' }

export function draw(ctx: CanvasRenderingContext2D, s: PassSnapshot): void {
  clear(ctx, s.golden ? '#2a2210' : '#0f1626')
  const pulse = (s.tick % 40) / 40

  for (const b of s.burrows) circle(ctx, b.x, b.y, 30, { fill: '#05080f', stroke: '#3b4763', width: 4 })

  // The glow's jump: a yellow trail from the old It to the new one, fading.
  if (s.flash) {
    const fade = 1 - s.flash.age / 40
    line(ctx, s.flash.fromX, s.flash.fromY, s.flash.toX, s.flash.toY, `rgba(255,226,122,${fade * 0.8})`, 14)
  }
  if (s.goal) circle(ctx, s.goal.x, s.goal.y, 16, { stroke: 'rgba(255,255,255,0.45)', width: 3 })

  s.critters.forEach((c, i) => {
    if (c.hidden) return
    const isIt = i === s.it
    if (isIt) {
      for (let k = 0; k < 3; k++) circle(ctx, c.x, c.y, c.r + 14 + k * 14 + pulse * 8, `rgba(255,220,90,${0.28 - k * 0.08})`)
    }
    circle(ctx, c.x, c.y, c.r, { fill: COLORS[c.kind], stroke: isIt ? '#ffe27a' : '#1a2238', width: 6 })
    // Eyes look where it is heading.
    const speed = Math.hypot(c.vx, c.vy)
    const ex = speed > 1 ? (c.vx / speed) * c.r * 0.35 : 0
    const ey = speed > 1 ? (c.vy / speed) * c.r * 0.35 : 0
    circle(ctx, c.x + ex - 8, c.y + ey - 4, 5, '#10131c')
    circle(ctx, c.x + ex + 8, c.y + ey - 4, 5, '#10131c')
    if (c.mode === 'shell') circle(ctx, c.x, c.y, c.r + 10, { stroke: '#8fd0ff', width: 8 })
    if (c.safe) circle(ctx, c.x, c.y, c.r + 8, { stroke: 'rgba(255,255,255,0.55)', width: 3 })
    if (c.alert && !isIt) label(ctx, '!', c.x, c.y - c.r - 12, { align: 'center', size: 36, color: '#ff8a6a' })
    label(ctx, c.kind, c.x, c.y + c.r + 28, { align: 'center', size: 22, color: '#c9d3ea' })
    // A magpie that remembers a tagger draws a thin line to it.
    if (c.kind === 'magpie' && c.tagger >= 0 && !isIt) {
      const t = s.critters[c.tagger]!
      line(ctx, c.x, c.y, t.x, t.y, 'rgba(242,242,247,0.25)', 2)
    }
  })

  if (s.hint) circle(ctx, s.hint.x, s.hint.y, 70 + pulse * 30, { stroke: `rgba(255,255,255,${0.7 - pulse * 0.6})`, width: 5 })

  const me = s.critters[s.it]!
  label(ctx, `you are the glow: the ${me.kind}. touch to steer, tag a friend to become it`, 30, 44, { size: 26, color: '#ffe27a' })
  label(ctx, `tags ${s.tags}`, 30, 78, { size: 22, color: '#8892ad' })
  if (s.been) {
    s.critters.forEach((c, i) => circle(ctx, 250 + i * 34, 72, 11, s.been![i] ? COLORS[c.kind] : { stroke: '#4a5573', width: 3 }))
    label(ctx, `sweeps ${s.sweeps ?? 0}`, 400, 78, { size: 22, color: '#8892ad' })
  }
}
