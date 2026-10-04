import { type Guidance, handPose, type HandPose } from './guidance'
import { type Ticket } from './jobs'
import { disc, INK, roundRect, type Ctx } from './paint'
import { trayPiece } from './paintBench'
import { paintPart } from './paintBoard'
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
 * With no idea it stands there dark: its cell lies out of its place. Her
 * paw is her own (paintOldHand.ts): it reaches here while she shows the way.
 */
export function paintPractice(c: Ctx, idea: string | null, neat: number, seconds: number, rock = 0): void {
  const { x, y, w, h } = PRACTICE
  // Touched, it rocks on the shelf it stands on, about its foot.
  c.save()
  c.translate(x + w / 2, y + h)
  c.rotate(rock * 0.09)
  c.translate(-x - w / 2, -y - h)
  roundRect(c, x + 2, y + 4, w, h, 8)
  c.fillStyle = 'rgba(28, 36, 44, 0.2)'
  c.fill()
  roundRect(c, x, y, w, h, 8)
  c.fillStyle = INK.mask
  c.fill()
  // With no idea to show it stands there dark: a loop, a lamp, and its cell lying out of its place.
  const mended = neat >= 0.45 || !idea, done = mended && neat >= 0.5
  const cy = y + h / 2, left = x + 22, right = x + w - 22, mid = x + w / 2, top = y + 12, bottom = y + h - 12
  if (!idea) idea = 'none'
  // A loop of copper round the board: a cell in its left side, a lamp in its right. What the job's idea needs is added to
  // it: a second cell in the bottom run, a second lamp on a rung of its own.
  c.strokeStyle = INK.copper
  c.lineWidth = 4
  c.strokeRect(left, top, right - left, bottom - top)
  const second = idea === 'branch' || (idea === 'ticket' && mended), rung = mid + 6
  if (second) {
    c.beginPath()
    c.moveTo(rung, top)
    c.lineTo(rung, bottom)
    c.stroke()
  }
  const cell = (cx: number, cy2: number, turn: number) => {
    c.save()
    c.translate(cx, cy2)
    c.rotate(turn)
    roundRect(c, -8, -14, 16, 28, 4)
    c.fillStyle = INK.cellBody
    c.fill()
    c.fillStyle = INK.cellBand
    c.fillRect(-8, -12, 16, 6)
    c.restore()
  }
  // A flat cell looks like any other. When she has changed it, the one she took out lies on its side, clear of the new one.
  if (idea === 'flat' && mended) cell(left + 30, cy + 6, Math.PI / 2)
  // Until she has a way to show, her board's cell lies out of its place, on its side: where it goes the loop is open
  // between two blobs of solder, and so the board is dark. No holder is drawn empty: a dark ring would read as a nought.
  if (idea === 'none') {
    c.fillStyle = INK.mask
    c.fillRect(left - 4, cy - 11, 8, 22)
    disc(c, left, cy - 12, 3.4, INK.solder)
    disc(c, left, cy + 12, 3.4, INK.solder)
    cell(left + 30, cy + 6, Math.PI / 2)
  } else cell(left, cy, 0)
  // Two cells in one loop: the second pushes against the first until she turns it round. A lamp would not care which
  // way one cell lay, so one cell turned would show nothing.
  if (idea === 'backwards') cell(mid - 8, bottom, mended ? -Math.PI / 2 : Math.PI / 2)
  // The first lamp is lit when its loop is whole. With a second lamp to be joined in, it is lit from the start.
  const whole = idea !== 'none' && (idea === 'branch' || idea === 'ticket' || done)
  const lamp = (lx: number, on: boolean, blown: boolean) => {
    disc(c, lx, cy, 11, INK.steel)
    disc(c, lx, cy, 8, on ? '#fff3c4' : blown ? INK.glassBlown : INK.glass)
    if (!on) return
    c.save()
    c.globalCompositeOperation = 'lighter'
    disc(c, lx, cy, 20 + Math.sin(seconds * 5 + lx), 'rgba(255, 214, 128, 0.35)')
    c.restore()
  }
  lamp(right, whole, (idea === 'dead' || idea === 'double') && !mended)
  if (second) lamp(rung, done, false)
  // The break itself, and what she does about it.
  c.fillStyle = INK.mask
  if (idea === 'switch') {
    // The switch itself, small, as it is drawn on any board: a black body, a steel lever, a red tip. Up, then thrown.
    c.fillRect(mid - 12, top - 4, 24, 8)
    c.save()
    c.translate(mid, top)
    paintPart(c, 30, { kind: 'switch', a: 0, b: 1, down: mended })
    c.restore()
  } else if (idea === 'short') {
    // A blob of solder from the top run to the bottom, a way round that misses the lamp: she takes it off.
    if (!mended) { c.fillStyle = INK.solder; c.fillRect(mid - 4, top, 8, bottom - top) }
  } else if (idea === 'stuff') {
    c.fillRect(mid - 12, top - 4, 24, 8)
    if (!mended) { roundRect(c, mid - 13, top - 5, 26, 10, 4); c.fillStyle = INK.rubber; c.fill() }
  } else if (idea === 'gap' || idea === 'double') c.fillRect(mid - 9, top - 4, 18, 8)
  else if (idea === 'branch') c.fillRect(rung - 4, top + 4, 8, 7)
  if (mended && (idea === 'gap' || idea === 'stuff' || idea === 'double')) paintLead(c, { x: mid - 11, y: top }, { x: mid + 11, y: top }, -16, INK.yellow, 30)
  // The second lamp's own rung had a gap in it: one short lead closes it, down the rung.
  if (mended && idea === 'branch') paintLead(c, { x: rung, y: top + 1 }, { x: rung, y: top + 14 }, 10, INK.yellow, 22)
  c.restore()
}

/**
 * One part as an order ticket draws it: a small picture, and unmistakably one. Beside a numeral a bare ring would read
 * as a nought and a bare bar as a minus, so a lamp is drawn with its filament and its two legs, a switch with its
 * round red knob, and a cell aslant with its band.
 */
function ticketPiece(c: Ctx, part: Ticket['part']): void {
  if (part === 'lamp') {
    c.strokeStyle = INK.steelDark
    c.lineWidth = 4
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(-7, 12)
    c.lineTo(-11, 24)
    c.moveTo(7, 12)
    c.lineTo(11, 24)
    c.stroke()
    disc(c, 0, 0, 16, INK.steel)
    disc(c, 0, 0, 12.5, '#ffe9a8')
    // The filament: one small coil, a ring within the glass with its two ends down to the legs. Not a zigzag.
    c.strokeStyle = INK.filament
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(-5, 9)
    c.quadraticCurveTo(-7, -6, 0, -6)
    c.quadraticCurveTo(7, -6, 5, 9)
    c.stroke()
    disc(c, -4, -4, 2.4, 'rgba(255, 255, 255, 0.8)')
    return
  }
  if (part === 'switch') {
    // A switch as a small thing with a knob to push: a dark body on a pale plate, and a round red knob on top of it.
    roundRect(c, -22, 4, 44, 12, 5)
    c.fillStyle = INK.steel
    c.fill()
    roundRect(c, -13, -6, 26, 14, 5)
    c.fillStyle = INK.plastic
    c.fill()
    disc(c, 4, -9, 7.5, INK.red)
    disc(c, 2, -11, 2.2, 'rgba(255, 255, 255, 0.55)')
    return
  }
  c.rotate(-0.6)
  trayPiece(c, part)
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
    ticketPiece(c, ticket.part)
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
