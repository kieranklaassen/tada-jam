import { type Board } from './board'
import { boardFor, isPad, type Circuit } from './circuit'
import { disc, INK, LEAD_COLOURS, type Ctx } from './paint'
import { at, type Lay } from './paintBoard'
import { level, RUNS_FROM, type Reading } from './solve'

// Leads, and what moves: the beads that stand for the current, a lit lamp's
// glow, a turning blade. The beads are the one invented thing on the bench.
// They are drawn only where the solved current is not zero, at a speed that
// is that current, so they run all the way round a closed loop or nowhere.

type P = { x: number; y: number }

/** The lazy curve a lead lies in between two points. `bend` is how far it bows to one side, in pixels. */
export function leadCurve(p: P, q: P, bend: number): [P, P, P, P] {
  const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1
  // Both ends in one place: a loop of nothing, which hangs down from where it is clipped and is wider the more it sways.
  if (d < 2) {
    const wide = 44 + Math.abs(bend) * 0.5
    return [p, { x: p.x - wide, y: p.y + wide * 1.7 }, { x: p.x + wide, y: p.y + wide * 1.7 }, q]
  }
  const nx = -dy / d, ny = dx / d
  return [p, { x: p.x + dx * 0.25 + nx * bend, y: p.y + dy * 0.25 + ny * bend }, { x: p.x + dx * 0.75 + nx * bend, y: p.y + dy * 0.75 + ny * bend }, q]
}

const onCurve = ([a, b, c, d]: [P, P, P, P], t: number): P => {
  const s = 1 - t
  return { x: s * s * s * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t * t * t * d.x, y: s * s * s * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t * t * t * d.y }
}

/** A crocodile clip biting at `p`, its boot pointing back along the lead toward `from`. */
function paintClip(c: Ctx, p: P, from: P, colour: string, u: number): void {
  c.save()
  c.translate(p.x, p.y)
  c.rotate(Math.atan2(from.y - p.y, from.x - p.x))
  // Two toothed jaws closed on the pad, then the coloured boot behind them.
  c.fillStyle = INK.steelDark
  c.beginPath()
  c.moveTo(-u * 0.1, 0)
  c.lineTo(u * 0.24, -u * 0.15)
  c.lineTo(u * 0.4, -u * 0.11)
  c.lineTo(u * 0.4, u * 0.11)
  c.lineTo(u * 0.24, u * 0.15)
  c.closePath()
  c.fill()
  c.fillStyle = INK.steel
  c.beginPath()
  c.moveTo(-u * 0.06, 0)
  c.lineTo(u * 0.24, -u * 0.115)
  c.lineTo(u * 0.4, -u * 0.08)
  c.lineTo(u * 0.4, u * 0.08)
  c.lineTo(u * 0.24, u * 0.115)
  c.closePath()
  c.fill()
  // The line where the two toothed jaws meet.
  c.strokeStyle = INK.steelDark
  c.lineWidth = u * 0.022
  c.beginPath()
  c.moveTo(-u * 0.05, 0)
  for (let i = 1; i <= 6; i++) c.lineTo(-u * 0.05 + i * u * 0.05, (i % 2 ? -1 : 1) * u * 0.024)
  c.stroke()
  c.fillStyle = colour
  c.beginPath()
  c.moveTo(u * 0.34, -u * 0.13)
  c.lineTo(u * 0.74, -u * 0.075)
  c.lineTo(u * 0.74, u * 0.075)
  c.lineTo(u * 0.34, u * 0.13)
  c.closePath()
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.3)'
  c.fillRect(u * 0.4, -u * 0.085, u * 0.3, u * 0.035)
  c.restore()
}

/** One lead from `p` to `q` with a clip on each end. `heat` from 0 to 1 makes the wire glow orange, as one that carried a short does. */
export function paintLead(c: Ctx, p: P, q: P, bend: number, colour: string, u: number, heat = 0): void {
  const curve = leadCurve(p, q, bend)
  const start = onCurve(curve, 0.16), end = onCurve(curve, 0.84)
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(start.x, start.y)
  for (let i = 1; i <= 20; i++) {
    const s = onCurve(curve, 0.16 + (0.68 * i) / 20)
    c.lineTo(s.x, s.y)
  }
  c.lineWidth = u * 0.1
  c.strokeStyle = 'rgba(20, 26, 32, 0.25)'
  c.save()
  c.translate(u * 0.03, u * 0.05)
  c.stroke()
  c.restore()
  c.strokeStyle = colour
  c.stroke()
  if (heat > 0) {
    c.lineWidth = u * 0.13
    c.strokeStyle = `rgba(255, 138, 42, ${Math.min(1, heat)})`
    c.stroke()
    c.lineWidth = u * 0.05
    c.strokeStyle = `rgba(255, 236, 170, ${Math.min(1, heat)})`
    c.stroke()
  }
  c.lineWidth = u * 0.02
  c.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  c.stroke()
  paintClip(c, p, start, colour, u)
  paintClip(c, q, end, colour, u)
}

/** How far a lead bows out. A short one stands well clear of what it bridges, so the crack under it stays in view. */
const bendOf = (lay: Lay, p: P, q: P, i: number) => (i % 2 ? -1 : 1) * lay.u * (Math.hypot(q.x - p.x, q.y - p.y) < lay.u * 1.6 ? 0.85 : 0.4)

/** The leads of a circuit, each in its own colour. A loose end lies on the mat beside the board. */
export function paintLeads(c: Ctx, lay: Lay, circuit: Circuit): void {
  const board = boardFor(circuit)
  circuit.leads.forEach((lead, i) => {
    // A board's own painter draws the leads that run pad to pad; a clip on anything else belongs to the mat's painter.
    if (!isPad(lead.a) || (lead.b !== null && !isPad(lead.b))) return
    const p = at(lay, board, lead.a as number)
    const q = lead.b === null ? { x: p.x - lay.u * 1.3, y: lay.y + (board.rows - 1) * lay.u + lay.u * 1.25 } : at(lay, board, lead.b)
    const colour = LEAD_COLOURS[i % LEAD_COLOURS.length]
    paintLead(c, p, q, bendOf(lay, p, q, i), colour, lay.u)
  })
}

/** Where a lead's curve runs, for the beads on it: the same curve `paintLeads` drew. */
function leadPath(lay: Lay, board: Board, circuit: Circuit, i: number): [P, P, P, P] | null {
  const lead = circuit.leads[i]
  if (lead.b === null || !isPad(lead.a) || !isPad(lead.b)) return null
  const p = at(lay, board, lead.a as number), q = at(lay, board, lead.b as number)
  return leadCurve(p, q, bendOf(lay, p, q, i))
}

/** The beads: one path for all of them and one fill, so a busy board costs two draws. Returns how many were drawn. */
export function paintBeads(c: Ctx, lay: Lay, circuit: Circuit, reading: Reading, seconds: number): number {
  const board = boardFor(circuit), u = lay.u, gap = u * 0.34, r = u * 0.05
  let count = 0
  c.beginPath()
  const along = (current: number, length: number, where: (t: number) => P) => {
    if (Math.abs(current) < RUNS_FROM) return
    // A bead's speed is the current. The phase runs toward `b` for a current from `a` to `b`.
    const shift = (((seconds * current * u * 1.15) % gap) + gap) % gap
    for (let d = shift; d < length; d += gap) {
      const p = where(d / length)
      c.moveTo(p.x + r, p.y)
      c.arc(p.x, p.y, r, 0, Math.PI * 2)
      count++
    }
  }
  board.traces.forEach((trace, i) => {
    const p = at(lay, board, trace.a), q = at(lay, board, trace.b)
    along(reading.traces[i], Math.hypot(q.x - p.x, q.y - p.y), (t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }))
  })
  circuit.leads.forEach((_, i) => {
    const curve = leadPath(lay, board, circuit, i)
    if (curve) along(reading.leads[i], Math.hypot(curve[3].x - curve[0].x, curve[3].y - curve[0].y) * 1.08, (t) => onCurve(curve, t))
  })
  c.fillStyle = INK.bead
  c.fill()
  c.lineWidth = u * 0.014
  c.strokeStyle = INK.beadEdge
  c.stroke()
  return count
}

/** A lit lamp's glow: one additive sprite, made once, drawn larger and stronger for more current. */
export function makeGlow(size: number): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = size
  const g = sprite.getContext('2d')!
  const fall = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  fall.addColorStop(0, 'rgba(255, 244, 214, 0.95)')
  fall.addColorStop(0.18, 'rgba(255, 214, 128, 0.6)')
  fall.addColorStop(0.5, 'rgba(255, 190, 90, 0.18)')
  fall.addColorStop(1, 'rgba(255, 180, 80, 0)')
  g.fillStyle = fall
  g.fillRect(0, 0, size, size)
  return sprite
}

/** The glow of every lamp that carries current. Returns how many were drawn. */
export function paintGlows(c: Ctx, lay: Lay, circuit: Circuit, reading: Reading, glow: HTMLCanvasElement, seconds: number): number {
  const board = boardFor(circuit)
  let count = 0
  c.save()
  c.globalCompositeOperation = 'lighter'
  circuit.parts.forEach((part, i) => {
    const much = level(reading.parts[i])
    if (part.kind !== 'lamp' || much === 0) return
    const p = at(lay, board, part.a), q = at(lay, board, part.b)
    // A filament is steady; the glow breathes by a hair so the bench is alive at idle.
    const size = lay.u * (1.3 + much * 0.9) * (1 + 0.02 * Math.sin(seconds * 5 + i))
    c.globalAlpha = 0.35 + much * 0.2
    c.drawImage(glow, (p.x + q.x) / 2 - size / 2, (p.y + q.y) / 2 - size / 2, size, size)
    count++
  })
  c.restore()
  return count
}

/** A fan blade on every motor, turned by its current. Returns how many were drawn. */
export function paintBlades(c: Ctx, lay: Lay, circuit: Circuit, reading: Reading, seconds: number): number {
  const board = boardFor(circuit), u = lay.u
  let count = 0
  circuit.parts.forEach((part, i) => {
    if (part.kind !== 'motor') return
    const p = at(lay, board, part.a), q = at(lay, board, part.b)
    c.save()
    c.translate((p.x + q.x) / 2, (p.y + q.y) / 2)
    c.rotate(seconds * reading.parts[i] * 9 + i)
    c.fillStyle = INK.blade
    for (let b = 0; b < 3; b++) {
      c.rotate((Math.PI * 2) / 3)
      c.beginPath()
      c.ellipse(u * 0.24, 0, u * 0.22, u * 0.1, 0.35, 0, Math.PI * 2)
      c.fill()
    }
    disc(c, 0, 0, u * 0.07, INK.steel)
    c.restore()
    count++
  })
  return count
}
