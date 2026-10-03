import { type Guidance, handPose, type HandPose } from './guidance'
import { type Ticket } from './jobs'
import { disc, INK, roundRect, type Ctx } from './paint'
import { trayPiece } from './paintBench'
import { paintLead } from './paintLive'
import { PRACTICE, type Box, type P } from './stage'
import { drawWhole } from './symbols'

// The small things of the scene that are neither a board nor a character: the
// old hand's practice board, an order ticket, and the idle ladder's rings and
// ghost hand.

/**
 * The old hand's practice board: a cell, a lamp, and between them the same
 * kind of break the job had. `neat` is how far she is through showing the
 * neat way: her board is broken before 0.45 and mended and running after.
 * With no idea it hangs there dark, a plain board with nothing on it.
 */
export function paintPractice(c: Ctx, idea: string | null, neat: number, seconds: number): void {
  const { x, y, w, h } = PRACTICE
  c.strokeStyle = INK.steelDark
  c.lineWidth = 2
  for (const hx of [x + 16, x + w - 16]) { c.beginPath(); c.moveTo(hx, y - 12); c.lineTo(hx, y + 6); c.stroke() }
  roundRect(c, x + 2, y + 4, w, h, 8)
  c.fillStyle = 'rgba(28, 36, 44, 0.2)'
  c.fill()
  roundRect(c, x, y, w, h, 8)
  c.fillStyle = INK.mask
  c.fill()
  // With no idea to show it hangs there whole and dark: a loop, a cell and a lamp.
  const mended = neat >= 0.45 || !idea, cy = y + h / 2, left = x + 22, right = x + w - 22, mid = x + w / 2
  // A loop of copper round the board: cell at the left, lamp at the right, the break in the top run.
  c.strokeStyle = INK.copper
  c.lineWidth = 4
  c.strokeRect(left, y + 12, right - left, h - 24)
  if (!idea) idea = 'none'
  const fresh = idea !== 'flat' || mended
  roundRect(c, left - 8, cy - 14, 16, 28, 4)
  c.fillStyle = fresh ? INK.cellBody : '#6a7078'
  c.fill()
  c.fillStyle = INK.cellBand
  if (idea === 'backwards' && !mended) c.fillRect(left - 8, cy + 6, 16, 6)
  else c.fillRect(left - 8, cy - 12, 16, 6)
  const lampOk = !(idea === 'dead' || idea === 'double') || mended
  const lit = mended && neat >= 0.5 && idea !== 'none'
  disc(c, right, cy, 11, INK.steel)
  disc(c, right, cy, 8, lit ? '#fff3c4' : lampOk ? INK.glass : INK.glassBlown)
  if (idea === 'ticket' || idea === 'branch') {
    // A second lamp beside the first: dark until she joins it in.
    disc(c, right - 24, cy, 11, INK.steel)
    disc(c, right - 24, cy, 8, lit ? '#fff3c4' : INK.glass)
  }
  if (lit) {
    c.save()
    c.globalCompositeOperation = 'lighter'
    disc(c, right, cy, 20 + Math.sin(seconds * 5), 'rgba(255, 214, 128, 0.35)')
    c.restore()
  }
  // The break itself, and what she does about it in one plain move.
  const top = y + 12
  c.fillStyle = INK.mask
  if (idea === 'switch') {
    c.fillRect(mid - 12, top - 4, 24, 8)
    c.strokeStyle = INK.steel
    c.lineWidth = 4
    c.beginPath()
    c.moveTo(mid - 12, top)
    c.lineTo(mid + 12, mended ? top : top - 12)
    c.stroke()
    disc(c, mid - 12, top, 3.5, INK.solder)
  } else if (idea === 'short') {
    if (!mended) { c.fillStyle = INK.solder; c.fillRect(mid - 4, top, 8, h - 24) }
  } else if (idea === 'stuff') {
    c.fillRect(mid - 12, top - 4, 24, 8)
    if (!mended) { roundRect(c, mid - 13, top - 5, 26, 10, 4); c.fillStyle = INK.rubber; c.fill() }
  } else if (idea !== 'flat' && idea !== 'dead' && idea !== 'backwards' && idea !== 'none') c.fillRect(mid - 9, top - 4, 18, 8)
  if (mended && (idea === 'gap' || idea === 'stuff' || idea === 'double' || idea === 'branch' || idea === 'ticket')) {
    paintLead(c, { x: mid - 11, y: top }, { x: mid + 11, y: top }, -16, INK.yellow, 30)
  }
  // Her paw comes over, does it, and goes back to the mug.
  const reach = neat < 0 || neat >= 1 ? 0 : Math.sin(Math.min(1, neat / 0.9) * Math.PI)
  if (reach > 0.02) {
    c.strokeStyle = '#8a929a'
    c.lineCap = 'round'
    c.lineWidth = 20
    c.beginPath()
    c.moveTo(x - 30, y + h + 40)
    c.lineTo(x - 30 + (mid - x + 30) * reach, y + h + 40 - (h + 40 - 14) * reach)
    c.stroke()
    disc(c, x - 30 + (mid - x + 30) * reach, y + h + 40 - (h + 40 - 14) * reach, 12, '#2b3037')
  }
}

/** An order ticket: a small card that draws the parts asked for, with the numeral for how many laid beside them. */
export function paintTicket(c: Ctx, ticket: Ticket, at: Box): void {
  c.save()
  c.translate(at.x + at.w / 2, at.y + at.h / 2)
  c.rotate(-0.06)
  roundRect(c, -at.w / 2 + 2, -at.h / 2 + 3, at.w, at.h, 6)
  c.fillStyle = 'rgba(28, 36, 44, 0.2)'
  c.fill()
  roundRect(c, -at.w / 2, -at.h / 2, at.w, at.h, 6)
  c.fillStyle = '#fbf6e8'
  c.fill()
  c.strokeStyle = '#c9bf9f'
  c.lineWidth = 2
  c.stroke()
  // A steel clip holds it to the case.
  roundRect(c, -9, -at.h / 2 - 8, 18, 14, 3)
  c.fillStyle = INK.steel
  c.fill()
  // The parts, drawn small in a row, as many as are asked for.
  const step = Math.min(34, (at.w - 46) / ticket.count)
  for (let i = 0; i < ticket.count; i++) {
    c.save()
    c.translate(-at.w / 2 + 20 + step * (i + 0.5) - 6, 2)
    c.scale(0.56, 0.56)
    // A dark edge under each, so a pale lamp reads on the pale card.
    c.shadowColor = 'rgba(30, 36, 44, 0.9)'
    c.shadowBlur = 0
    c.shadowOffsetX = 1.5 * c.getTransform().a
    c.shadowOffsetY = 1.5 * c.getTransform().a
    trayPiece(c, ticket.part)
    c.restore()
  }
  // The numeral lies beside the group it counts. The drawing carries the order without it.
  drawWhole(c, ticket.count, at.w / 2 - 17, 3, 26, { fill: '#2a323d' })
  c.restore()
}

/** A breathing ring on each thing that can be touched now. It marks the thing and leaves the scene clear. */
export function paintRings(c: Ctx, at: readonly P[], glow: number, seconds: number): number {
  if (glow <= 0.01) return 0
  const r = 40 + Math.sin(seconds * 3) * 4
  for (const p of at) {
    c.beginPath()
    c.arc(p.x, p.y, r, 0, Math.PI * 2)
    c.lineWidth = 9
    c.strokeStyle = `rgba(40, 46, 54, ${0.25 * glow})`
    c.stroke()
    c.lineWidth = 5
    c.strokeStyle = `rgba(255, 214, 92, ${0.95 * glow})`
    c.stroke()
  }
  return at.length
}

const POSE: HandPose = { travel: 0, press: 0, opacity: 0 }

/** The ghost hand, showing one move: a tap where it stands, or a drag from one place to another. */
export function paintGhostHand(c: Ctx, guidance: Guidance, from: P, to: P, drag: boolean): number {
  if (guidance.demo === null) return 0
  const pose = handPose(guidance.demo, drag, POSE)
  const x = from.x + (to.x - from.x) * pose.travel, y = from.y + (to.y - from.y) * pose.travel
  c.save()
  c.globalAlpha = pose.opacity * 0.92
  if (drag && pose.travel > 0.02) {
    c.lineCap = 'round'
    c.lineWidth = 7
    c.strokeStyle = 'rgba(255, 255, 255, 0.75)'
    c.beginPath()
    c.moveTo(from.x, from.y)
    c.quadraticCurveTo((from.x + x) / 2, (from.y + y) / 2 + 40, x, y)
    c.stroke()
  }
  if (pose.press > 0.05) {
    c.lineWidth = 4
    c.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    c.beginPath()
    c.arc(x, y, 18 + pose.press * 10, 0, Math.PI * 2)
    c.stroke()
  }
  // A plain hand: one pointing finger and a palm, pale with a dark edge so it reads on the mat and on the green.
  c.translate(x, y)
  c.rotate(-0.5)
  c.scale(1 - pose.press * 0.08, 1 - pose.press * 0.08)
  c.lineJoin = 'round'
  c.lineWidth = 4
  c.strokeStyle = 'rgba(40, 46, 54, 0.9)'
  c.fillStyle = '#fbf3e6'
  roundRect(c, -13, -4, 26, 78, 13)
  c.fill()
  c.stroke()
  roundRect(c, -30, 46, 66, 62, 24)
  c.fill()
  c.stroke()
  roundRect(c, -11, 0, 22, 60, 11)
  c.fill()
  c.restore()
  return 3
}
