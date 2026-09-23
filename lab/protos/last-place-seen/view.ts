// Flat shapes from the snapshot. Each guard's gaze is a coloured wedge to the
// log it is looking at (red while it leans in to peek); a guard that looks
// away shows "away". A dashed line ends in a gold "?" at the log the guard
// BELIEVES holds the treasure, which is not always where it is.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import type { LastPlaceSnapshot } from './sim.ts'

const centreOf = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

function gem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string): void {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r * 0.8, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r * 0.8, y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 4
  ctx.stroke()
}

function wedge(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, fill: string): void {
  const dx = toX - fromX
  const dy = toY - fromY
  const d = Math.hypot(dx, dy) || 1
  const nx = (-dy / d) * 46
  const ny = (dx / d) * 46
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX + nx, toY + ny)
  ctx.lineTo(toX - nx, toY - ny)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

export function draw(ctx: CanvasRenderingContext2D, snapshot: LastPlaceSnapshot): void {
  clear(ctx, '#cfe2bd')
  const { logs, guards } = snapshot

  // Gaze wedges under everything else.
  for (const g of guards) {
    if (g.gaze < 0) continue
    const c = centreOf(logs[g.gaze]!)
    wedge(ctx, g.x, g.y, c.x, c.y, g.mode === 'lean' ? 'rgba(214,60,50,0.38)' : 'rgba(255,214,60,0.34)')
  }

  logs.forEach((log, i) => {
    const c = centreOf(log)
    const isHome = i === snapshot.home
    roundRect(ctx, log.x, log.y, log.w, log.h, 40, { fill: '#8b5a2f', stroke: isHome ? '#2f8f4e' : '#5a3a1c', width: isHome ? 9 : 4 })
    roundRect(ctx, log.x + 18, log.y + 18, log.w - 36, log.h - 36, 26, '#3b2412')
    if (isHome) {
      line(ctx, c.x + 60, log.y + 6, c.x + 60, log.y - 44, '#2b2620', 5)
      rect(ctx, c.x + 60, log.y - 44, 44, 26, '#2f8f4e')
      label(ctx, 'flag', c.x, log.y - 12, { align: 'center', size: 20, color: '#2f6b3f' })
    }
    if (snapshot.hint?.log === i) circle(ctx, c.x, c.y, 88 + ((snapshot.tick % 30) / 30) * 26, { stroke: 'rgba(43,38,32,0.6)', width: 5 })
  })

  // The treasure: in its log, glowing when lifted, following the finger when dragged.
  const t = centreOf(logs[snapshot.treasure]!)
  const at = snapshot.drag ?? t
  if (snapshot.selected) circle(ctx, at.x, at.y, 44, 'rgba(255,255,255,0.55)')
  gem(ctx, at.x, at.y, snapshot.selected ? 30 : 24, '#f4c430', '#8a6a00')

  for (const g of guards) {
    const goose = g.kind === 'goose'
    const believed = g.belief >= 0 ? centreOf(logs[g.belief]!) : null
    if (believed) {
      ctx.setLineDash([10, 12])
      line(ctx, g.x, g.y, believed.x, believed.y - 58, goose ? '#7a7a7a' : '#8a4b1f', 3)
      ctx.setLineDash([])
      circle(ctx, believed.x + (goose ? -26 : 26), believed.y - 62, 16, { fill: '#fff3b8', stroke: goose ? '#7a7a7a' : '#8a4b1f', width: 4 })
      label(ctx, '?', believed.x + (goose ? -26 : 26), believed.y - 70, { align: 'center', size: 22 })
    }
    circle(ctx, g.x, g.y, goose ? 32 : 34, { fill: goose ? '#fafafa' : '#a6683a', stroke: '#2b2620', width: 4 })
    circle(ctx, g.x + 10, g.y - 6, 5, '#2b2620')
    label(ctx, goose ? 'goose' : 'hound', g.x, g.y + 62, { align: 'center', size: 22, color: '#2b2620' })
    if (g.gaze < 0) label(ctx, g.mode === 'walk' ? 'nose down' : 'looking away', g.x, g.y - 46, { align: 'center', size: 20, color: '#555' })
    else if (g.mode === 'lean') label(ctx, 'peeking', g.x, g.y - 46, { align: 'center', size: 20, color: '#b02a20' })
    if (g.belief < 0) label(ctx, 'lost it!', g.x, g.y - 46, { align: 'center', size: 22, color: '#b02a20' })
  }

  label(ctx, 'Tap the gem log, then another log, to shift it. Take it at the flag when no wedge points there.', 40, 760, { size: 24, color: '#2b2620' })
  label(ctx, `hauls ${snapshot.hauls}   caught ${snapshot.caught}   seen ${snapshot.spotted}`, 40, 48, { size: 30 })
  if (snapshot.note && snapshot.noteAge < 60) label(ctx, snapshot.note, 590, 340, { align: 'center', size: 44, color: '#2b2620' })
}
