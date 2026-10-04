import { poseOf, type Actor } from './cast'
import { drawCustomer, type Casting } from './castFigures'
import { feastOf, leavingFeast, wantedCount, type Feast } from './feast'
import { dog } from './figures'
import { CURL_FLIGHT, MOUTH, flight, offsetOf, type FxState } from './fx'
import type { Scenery } from './gameRun'
import type { Guide } from './guide'
import type { HandPose } from './guidance'
import { BLUE, BOARD as BOARD_FILL, BOARD_EDGE, FLESH, INK, PAPER, RED, RIND, TINT, WHITE, YELLOW, burst, inked, panel, poly, rect, slab, speedLines, oval, type Screens } from './look'
import { FRUITS, WHOLE, type Fruit } from './measure'
import { tinAt } from './moves'
import { tinParts, wanted, type Customer } from './orders'
import { paintPassers } from './passersBy'
import { ruling } from './serve'
import { SILL, fitOf, headOf, standsAt, type Seat } from './seats'
import { paintCounter, paintStreet, paintWear } from './setting'
import { BOARD, COUNTER, CRATE, DOG, PX, QUEUE, ROLLER, SHELF_BOX, TIN, WALL, WINDOW, laneTop, rowTop, shown, tinShape, type Box, type Point, type TinShape } from './stage'
import { drawFraction, drawSign } from './symbols'
import { eaten, marksOf, SHELF, type Piece } from './world'

// How the game is drawn, in the look: comic-book halftone. Everything still
// is painted once onto a plate; a frame stamps the plate and draws what moves
// on top. The fruit and its pieces stay flat, on a plain board and a plain
// shelf; the dots are on the wall, the counter, the crate and the characters.
// Every numeral and sign is drawn by symbols.ts, on or beside the length it
// names. Both painters take the context they draw on and count the figures
// they draw, so a test can run them on a stand-in and hold a frame to a budget.

type Ctx = CanvasRenderingContext2D
type Dots = Pick<Screens, 'of'>
const SCALLOPS = 16
/** Where a served customer's shut tin stands, by its feet, and the top of every ticket. */
const TIN_BY_FEET = WINDOW.x + 290
const TICKET_TOP = WALL.y + 54

/** Everything that never moves: the two panels, the board, the shelf, the dog's arch and the roller's hook. Returns the figures drawn. */
export function paintPlate(ctx: Ctx, dots: Dots): number {
  // The stall's panel: the street behind, then the stall's own front. The counter's panel: worn wood and what lies about on it.
  panel(ctx, WALL.x, WALL.y, WALL.w, WALL.h, PAPER, dots.of(ctx, BLUE, 0.2))
  let drawn = paintStreet(ctx, dots)
  inked(ctx, rect(WALL.x, WALL.y, WALL.w, WALL.h), null, 6)
  panel(ctx, COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h, PAPER, dots.of(ctx, YELLOW, 0.22))
  drawn += paintCounter(ctx, dots)
  inked(ctx, rect(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h), null, 6)
  // The board and the shelf: plain pale slabs with a hard shadow, and nothing on them but lines between the lanes.
  for (const box of [BOARD, SHELF_BOX]) {
    ctx.fillStyle = INK
    ctx.fillRect(box.x + 6, box.y + 6, box.w, box.h)
    inked(ctx, rect(box.x, box.y, box.w, box.h), BOARD_FILL, 5)
  }
  ctx.fillStyle = BOARD_EDGE
  ctx.fillRect(BOARD.x + 3, laneTop(0) - 7.5, BOARD.w - 6, 3)
  drawn += paintWear(ctx)
  for (let slot = 1; slot < SHELF; slot++) ctx.fillRect(SHELF_BOX.x + 3, rowTop(slot) - 1.5, SHELF_BOX.w - 6, 3)
  // Every other slat of the shelf is a shade deeper: it is a rack of slats, still plain and still pale.
  ctx.fillStyle = '#d0dde3'
  for (let slot = 1; slot < SHELF; slot += 2) ctx.fillRect(SHELF_BOX.x + 3, rowTop(slot) + 1.5, SHELF_BOX.w - 6, 51)
  // The dog's way up from under the counter: a dark arch with a pale sill, which the dog looks out of.
  inked(ctx, (c) => {
    c.moveTo(DOG.x + 6, DOG.y + DOG.h + 6)
    c.lineTo(DOG.x + 6, DOG.y + 84)
    c.arc(DOG.x + DOG.w / 2, DOG.y + 84, DOG.w / 2 - 6, Math.PI, 0)
    c.lineTo(DOG.x + DOG.w - 6, DOG.y + DOG.h + 6)
    c.closePath()
  }, INK, 5)
  inked(ctx, slab(DOG.x - 6, DOG.y + DOG.h, DOG.w + 12, 14, 5), WHITE, 4)
  // The roller hangs from the peg rail on two short cords, each a run of dashes: no bar here meets another to make a shape that could be read.
  ctx.fillStyle = INK
  for (const cord of [ROLLER.x + ROLLER.w / 2 - 34, ROLLER.x + ROLLER.w / 2 + 34]) for (let dash = 0; dash < 3; dash++) ctx.fillRect(cord - 2.5, COUNTER.y + 14 + dash * 12, 5, 8)
  return drawn + 12 + SHELF
}

/** A fruit or a piece: a flat colour, square ends and a thin darker line. A squash lowers it onto its own base; its length never changes. */
function bar(ctx: Ctx, fruit: Fruit, box: Box, dx = 0, dy = 0, squash = 0): void {
  const h = box.h * (1 - squash), y = box.y + dy + (box.h - h)
  ctx.fillStyle = FLESH[fruit]
  ctx.fillRect(box.x + dx + 1, y, box.w - 2, h)
  ctx.lineWidth = 3
  ctx.strokeStyle = RIND[fruit]
  ctx.strokeRect(box.x + dx + 2.5, y + 1.5, box.w - 5, h - 3)
}

/** A piece as it lies, with the marks the roller pressed into it: thin lines across it, where its equal parts end. */
function pieceBar(ctx: Ctx, piece: Piece, box: Box, dx: number, dy: number, squash: number): void {
  bar(ctx, piece.fruit, box, dx, dy, squash)
  const marks = marksOf(piece)
  if (marks.length === 0) return
  ctx.fillStyle = RIND[piece.fruit]
  for (const at of marks) ctx.fillRect(box.x + dx + at * PX - 1.5, box.y + dy + 6, 3, box.h - 12)
}

function awning(ctx: Ctx, time: number, flap: number): number {
  const w = WALL.w / SCALLOPS
  for (let i = 0; i < SCALLOPS; i++) {
    // Each scallop hangs a little differently and they do not sway as one; a flap runs along them like a wave.
    const hang = 18 + 3 * Math.sin(time * 1.1 + i * 0.9) + 22 * flap * Math.sin(i * 0.8 + time * 7)
    const x = WALL.x + i * w
    inked(ctx, (c) => {
      c.moveTo(x, WALL.y)
      c.lineTo(x + w, WALL.y)
      c.lineTo(x + w, WALL.y + 8)
      c.ellipse(x + w / 2, WALL.y + 8, w / 2, Math.max(5, hang), 0, 0, Math.PI)
      c.closePath()
    }, i % 2 ? WHITE : RED, 4)
  }
  return SCALLOPS
}

function crate(ctx: Ctx, dots: Dots, rock: number, ordered: Fruit | null, time: number, split = 0): number {
  ctx.save()
  ctx.translate(CRATE.x + CRATE.w / 2, CRATE.y + CRATE.h)
  ctx.rotate(rock * 0.05)
  ctx.translate(-CRATE.w / 2, -CRATE.h)
  // The ends of three fruits show over the top slat: the crate is where fresh fruit comes from. The kind that is
  // on order stands up out of it and bobs: that is the one a tap will bring.
  FRUITS.forEach((fruit, i) => {
    const up = fruit === ordered ? 22 + 4 * Math.sin(time * 5) : 0
    bar(ctx, fruit, { x: 14 + i * 40, y: -12 - up, w: 32, h: 38 + up })
  })
  inked(ctx, rect(0, 22, CRATE.w, CRATE.h - 22), '#d9a441', 5, dots.of(ctx, RED, 0.3))
  for (let slat = 1; slat < 3; slat++) inked(ctx, rect(0, 22 + (slat * (CRATE.h - 22)) / 3, CRATE.w, 0.01), null, 4)
  if (split > 0) {
    // The top slat, split by the blade: a dark wedge where the wood has parted, closing again as it mends.
    inked(ctx, poly([[CRATE.w / 2 - 20 * split, 22], [CRATE.w / 2 + 22 * split, 22], [CRATE.w / 2 + 7 * split, 22 + 38 * split], [CRATE.w / 2 - 6 * split, 22 + 24 * split]]), INK, 3)
  }
  ctx.restore()
  return 7
}

/** The roller: a ridged drum on a handle. It hangs on its hook, or goes where the finger or a scene has it. */
function roller(ctx: Ctx, dots: Dots, at: Point): number {
  inked(ctx, slab(at.x - 46, at.y - 20, 92, 40, 10), WHITE, 5, dots.of(ctx, BLUE, 0.4))
  ctx.fillStyle = INK
  for (let ridge = 1; ridge < 6; ridge++) ctx.fillRect(at.x - 46 + ridge * 15.3 - 1.5, at.y - 18, 3, 36)
  return 2
}

function effects(ctx: Ctx, fx: FxState, wall: boolean): number {
  let drawn = 0
  for (const one of fx.fx) {
    if ((one.kind === 'spatter') !== wall || one.age < 0 || one.kind === 'lid' || one.kind === 'jaw' || one.kind === 'slat' || one.kind === 'answer') continue
    const t = one.age / one.life
    drawn++
    switch (one.kind) {
      case 'spatter': {
        // It dries in its last two seconds: smaller, then gone.
        const dry = Math.min(1, (one.life - one.age) / 2)
        burst(ctx, one.x, one.y, one.r * 0.95 * dry, one.r * 1.5 * dry, 6, one.seed, FLESH[one.fruit], 3)
        break
      }
      case 'burst': {
        const pop = 0.55 + 0.7 * Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.5)
        burst(ctx, one.x, one.y, one.size * 0.45 * pop, one.size * pop, 9, one.seed, WHITE, 4)
        burst(ctx, one.x, one.y, one.size * 0.2 * pop, one.size * 0.5 * pop, 7, one.seed + 3, FLESH[one.fruit], 3)
        break
      }
      case 'lines':
        speedLines(ctx, one.x - Math.cos(one.angle) * one.reach, one.y - Math.sin(one.angle) * one.reach, one.angle, 0.3, one.reach * t * 0.8, one.reach, 4)
        break
      case 'drop':
        inked(ctx, oval(one.x, one.y, one.r, one.r), FLESH[one.fruit], 2.5)
        break
      case 'star':
        burst(ctx, one.x, one.y, one.size * 0.42, one.size * (0.7 + 0.5 * t), 7, one.seed, WHITE, 3.5)
        burst(ctx, one.x, one.y, one.size * 0.16, one.size * 0.4, 5, one.seed + 2, YELLOW, 2.5)
        break
      case 'sweat':
        // Three drops fly off the head and fall away.
        for (let drop = 0; drop < 3; drop++) {
          const a = -3.5 + drop * 0.55 + 0.25 * Math.sin(one.seed + drop), reach = 34 + 50 * t
          const dx = one.x + Math.cos(a) * reach, dy = one.y + Math.sin(a) * reach + 50 * t * t
          inked(ctx, (c) => { c.moveTo(dx, dy - 14); c.quadraticCurveTo(dx + 11, dy + 3, dx, dy + 9); c.quadraticCurveTo(dx - 11, dy + 3, dx, dy - 14) }, '#c9d6e6', 3)
        }
        break
      case 'shock':
        speedLines(ctx, one.x, one.y, -Math.PI / 2, 2.6, one.r * (0.75 + 0.2 * t), one.r * (1.2 + 0.3 * t), 7)
        break
      case 'curl': {
        // In the air to the dog; then it sits on the dog's head, rocking, until the dog has it.
        const air = Math.min(1, one.age / CURL_FLIGHT), sat = one.age > CURL_FLIGHT
        const at = flight(one.fromX, one.fromY, air, { x: MOUTH.x - 4, y: DOG.y + 4 })
        if (sat) at.x += 3 * Math.sin(one.age * 20)
        // A curl of peel is a filled sickle of the fruit's colour, turning over and over as it flies: a shape, not a line that winds.
        const k = sat ? 1.7 : 1 + 0.7 * air
        ctx.save()
        ctx.translate(at.x, at.y)
        ctx.rotate(sat ? 0.5 + 0.25 * Math.sin(one.age * 20) : air * 22)
        ctx.beginPath()
        ctx.moveTo(-13 * k, 4 * k)
        ctx.quadraticCurveTo(0, -20 * k, 13 * k, 4 * k)
        ctx.quadraticCurveTo(0, -7 * k, -13 * k, 4 * k)
        ctx.fillStyle = FLESH[one.fruit]
        ctx.fill()
        ctx.lineWidth = 3
        ctx.strokeStyle = RIND[one.fruit]
        ctx.lineJoin = 'round'
        ctx.stroke()
        ctx.restore()
        break
      }
      case 'fly': {
        // A piece on its way to a mouth: it shrinks into it, turning as it goes.
        const at = flight(one.from.x + one.from.w / 2, one.from.y + one.from.h / 2, t, { x: one.tx, y: one.ty })
        const scale = 1 - 0.75 * t
        ctx.save()
        ctx.translate(at.x, at.y)
        ctx.rotate(t * 2.4)
        bar(ctx, one.fruit, { x: (-one.from.w * scale) / 2, y: (-one.from.h * scale) / 2, w: one.from.w * scale, h: one.from.h * scale })
        ctx.restore()
        break
      }
      case 'knock':
        // A small white star where the knock fell: a filled shape, not strokes that cross.
        burst(ctx, one.x, one.y, 5 + 4 * t, 12 + 9 * t, 6, one.x + one.y, WHITE, 2.5)
        break
    }
  }
  return drawn
}

/** A ticket: a card with a small strip of the fruit for each share ordered, the share filled in, and, once it is written, the fraction on a bracket over that share. */
function ticket(ctx: Ctx, customer: Customer, x: number, top: number, s: number, stacked = false): number {
  const whole = (WHOLE[customer.fruit] / WHOLE.long) * 190 * s
  let left = x, y = top, drawn = 0
  for (const share of customer.shares) {
    const reach = Math.max(1, share.num / share.den)
    // The card is as wide as the whole fruits drawn on it: an order past one whole shows two.
    const w = whole * Math.ceil(reach) + 40 * s, h = (customer.written ? 122 : 62) * s
    ctx.fillStyle = INK
    ctx.fillRect(left + 4, y + 4, w, h)
    inked(ctx, rect(left, y, w, h), WHITE, 3.5)
    const sx = left + 20 * s, sy = y + (customer.written ? 82 : 20) * s, tall = 26 * s
    const filled = (whole * share.num) / share.den
    ctx.fillStyle = FLESH[customer.fruit]
    ctx.fillRect(sx, sy, filled, tall)
    ctx.lineWidth = 2.5 * s + 0.5
    ctx.strokeStyle = INK
    for (let k = 0; k < Math.ceil(reach); k++) ctx.strokeRect(sx + whole * k, sy, whole, tall)
    if (customer.lined) {
      ctx.fillStyle = INK
      for (let part = 1; part < share.den * Math.ceil(reach); part++) if (part % share.den !== 0) ctx.fillRect(sx + (whole * part) / share.den - 1, sy, 2, tall)
    }
    if (customer.written) {
      // A bracket over the filled share, and the fraction on the bracket: the symbol names that length.
      ctx.beginPath()
      ctx.moveTo(sx, sy - 5 * s)
      ctx.lineTo(sx, sy - 12 * s)
      ctx.lineTo(sx + filled, sy - 12 * s)
      ctx.lineTo(sx + filled, sy - 5 * s)
      ctx.lineWidth = 2.5 * s + 0.5
      ctx.stroke()
      drawFraction(ctx, share, sx + filled / 2, sy - 44 * s, 28 * s, { fill: INK })
    }
    if (stacked) y += h + 6 * s
    else left += w + 8 * s
    drawn += 6
  }
  return drawn
}

/** The tin on the rail. Shut, it is folded small. Open, it is exactly as long as the order, with its lid standing behind it and the whole fruit ruled into its parts on the strip under it. */
function tin(ctx: Ctx, dots: Dots, scenery: Scenery, shape: TinShape, customer: Customer, up = 0, spin = 0): number {
  const { body, lid, ruler } = shape
  if (!shape.open) {
    // Folded, it says nothing of how long the order is: a small box with the creases of its folds.
    inked(ctx, rect(body.x, body.y, body.w, body.h), '#c9d6e6', 5, dots.of(ctx, BLUE, 0.3))
    ctx.fillStyle = INK
    for (let fold = 1; fold < 5; fold++) ctx.fillRect(body.x + (body.w * fold) / 5 - 1.5, body.y + 6, 3, body.h - 12)
    return 3
  }
  const show = scenery.show
  const ruled = ruling(customer)
  const share = wanted(customer)
  const showing = show !== null && show.drop > 0 && show.fill < 1
  const partsRuled = showing ? show.ruled : ruled.rows[0].parts
  const fill = showing ? show.fill : 1
  // The lid, standing open behind the tin, as long as the tin, with the fraction on it. In the serve it comes
  // down: flat on a fit, and bouncing on what sticks out.
  const closing = show !== null && show.kind === 'serve' && scenery.ending !== null ? show.lid : 0
  const bounce = closing > 0 && scenery.ending!.result.kind === 'over' ? 0.35 + 0.25 * Math.abs(Math.sin(closing * Math.PI * 3)) : 1
  // Outside the serve, a misfit just laid in brings the lid down too: it bounces on what sticks out, or shuts on a gap, and springs back open.
  const tried = scenery.fx.fx.find((one) => one.kind === 'lid' && one.age >= 0)
  const t = tried ? tried.age / tried.life : 0
  const attempt = tried && tried.kind === 'lid' ? (tried.how === 'over' ? 0.55 * Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t) + 0.3 * Math.sin(t * Math.PI) : Math.sin(t * Math.PI)) : 0
  const down = Math.max(closing * bounce, attempt)
  // In the serve the tin is lifted off its rail, with a hard shadow where it lay; and while the twins pull, it spins about its own length.
  ctx.save()
  if (up > 0) {
    ctx.fillStyle = INK
    ctx.fillRect(body.x + 5, body.y + 8, body.w, body.h)
    const turned = Math.cos(spin), middle = body.y + body.h / 2 - up
    ctx.translate(0, middle)
    ctx.scale(1, Math.abs(turned) < 0.1 ? (turned < 0 ? -0.1 : 0.1) : turned)
    ctx.translate(0, -middle - up)
  }
  inked(ctx, poly([[lid.x, lid.y + lid.h], [lid.x + 12 * (1 - down), lid.y + lid.h * down], [lid.x + lid.w + 12 * (1 - down), lid.y + lid.h * down], [lid.x + lid.w, lid.y + lid.h]]), '#c9d6e6', 4, dots.of(ctx, BLUE, 0.3))
  if (customer.written && down < 0.5 && spin === 0) drawFraction(ctx, share, lid.x + lid.w / 2 + 6, lid.y + lid.h / 2, 17, { fill: INK, edge: WHITE, edgeWidth: 5 })
  // Shut, the lid lies over the tin and what is in it is no longer seen.
  inked(ctx, rect(body.x, body.y, body.w, body.h), down >= 0.99 ? '#c9d6e6' : '#eef3f8', 5, down >= 0.99 ? dots.of(ctx, BLUE, 0.3) : undefined)
  // The sprung jaw at the end of each compartment, and the twins' divider between the two. Poked, or springing open, the jaw snaps out and back, twice.
  const snapping = scenery.fx.fx.find((one) => one.kind === 'jaw')
  const bite = snapping ? Math.abs(Math.sin((snapping.age / snapping.life) * Math.PI * 2)) * (1 - snapping.age / snapping.life) : 0
  shape.parts.forEach((part, index) => {
    const last = index === shape.parts.length - 1
    if (!last) {
      const drop = show && show.drop > 0 && show.extra < 1 ? show.extra : 1
      ctx.fillStyle = INK
      ctx.fillRect(part.x + part.w - 2, body.y - 10 * (1 - drop), 4, body.h * drop + 10 * (1 - drop))
      return
    }
    // The jaw is a thick wall across the end of the compartment, exactly where the order ends; as it snaps it jumps out past the tin's end and back.
    ctx.fillStyle = INK
    ctx.fillRect(part.x + part.w + 18 * bite, body.y + 3, 7, body.h - 6)
  })
  ctx.restore()
  // The rail: the whole fruit ruled into its equal parts, the ordered ones in the fruit's tint. One row for each share.
  // One row is the strip's own height; the cat's two rows are each a little shorter than that, one under the other.
  const rowH = ruled.rows.length > 1 ? 12 : ruler.h
  const whole = WHOLE[customer.fruit] * PX
  ruled.rows.forEach((row, index) => {
    const y = ruler.y + index * rowH
    const lit = (whole * row.lit) / row.parts
    ctx.fillStyle = WHITE
    ctx.fillRect(ruler.x, y, ruler.w, rowH)
    ctx.fillStyle = TINT[customer.fruit]
    ctx.fillRect(ruler.x, y, lit * fill, rowH)
    ctx.lineWidth = 2.5
    ctx.strokeStyle = INK
    ctx.strokeRect(ruler.x, y, ruler.w, rowH)
    ctx.fillStyle = INK
    const marks = Math.ceil((ruler.w / whole) * row.parts)
    for (let part = 1; part < marks; part++) if (part <= partsRuled + 0.001) ctx.fillRect(ruler.x + (whole * part) / row.parts - 1.25, y - (ruled.rows.length > 1 ? 0 : 3), 2.5, rowH + (ruled.rows.length > 1 ? 0 : 6))
  })
  // The roller on the open tin: the ruled parts answer one by one, each standing up white for its knock.
  const answering = scenery.fx.fx.find((one) => one.kind === 'answer')
  if (answering && answering.kind === 'answer') {
    const parts = ruled.rows[0].parts, at = Math.min(answering.parts - 1, Math.floor((answering.age / answering.life) * answering.parts))
    inked(ctx, rect(ruler.x + (whole * at) / parts, ruler.y - 7, whole / parts, rowH * ruled.rows.length + 10), WHITE, 3)
  }
  // The sign between the cat's two shares, laid just past their ends.
  if (ruled.sign && customer.written && (!showing || show.extra > 0)) {
    const end = Math.max(...ruled.rows.map((row) => (whole * row.lit) / row.parts))
    drawSign(ctx, ruled.sign, ruler.x + end + 16, ruler.y + rowH, 22, { fill: INK, edge: WHITE, edgeWidth: 5 })
  }
  return 8 + 4 * ruled.rows.length
}

/**
 * A customer standing in its seat with its feet on the sill. While a finger is down and the customer is doing
 * nothing else, its eyes follow the finger.
 */
function customerAt(ctx: Ctx, dots: Dots, customer: Customer, actor: Actor | null, cast: Partial<Casting>, seat: Seat, finger: Point | null = null, exit = 0): number {
  if (!actor) return 0
  const { x, y } = standsAt(customer.who, seat), { s, room } = fitOf(customer, seat)
  const head = headOf(customer, seat)
  const watch = finger && !actor.react ? { x: Math.max(-1, Math.min(1, (finger.x - head.x) / 260)), y: Math.max(-1, Math.min(1, (finger.y - head.y) / 200)) } : null
  const full: Casting = {
    who: customer.who,
    fruit: customer.fruit,
    pose: watch ? (member) => ({ ...poseOf(actor, member), eyeX: watch.x, eyeY: watch.y }) : (member) => poseOf(actor, member),
    feast: cast.feast ?? feastOf(customer, [], null, null),
    show: cast.show ?? null,
    count: wantedCount(customer),
    parts: wanted(customer).den,
  }
  drawCustomer(ctx, dots, full, x, y, s, room, exit)
  return customer.who === 'ants' ? full.count * 6 : customer.who === 'twins' ? 30 : 16
}

/** The glow of the idle ladder, as the page would print it: a yellow band with a black edge round the thing. */
function glow(ctx: Ctx, box: Box, strength: number, time: number): number {
  const pulse = 5 + 3 * Math.sin(time * 3.2)
  ctx.save()
  ctx.globalAlpha = strength
  ctx.lineJoin = 'round'
  ctx.lineWidth = pulse + 8
  ctx.strokeStyle = INK
  ctx.strokeRect(box.x - 7, box.y - 7, box.w + 14, box.h + 14)
  ctx.lineWidth = pulse + 3
  ctx.strokeStyle = YELLOW
  ctx.strokeRect(box.x - 7, box.y - 7, box.w + 14, box.h + 14)
  ctx.restore()
  return 2
}

/** The ghost hand: a white glove with one finger out, pressing down as it strokes, carries or taps. */
function ghostHand(ctx: Ctx, guide: Guide, hand: HandPose): number {
  const x = guide.hand.from.x + (guide.hand.to.x - guide.hand.from.x) * hand.travel
  const y = guide.hand.from.y + (guide.hand.to.y - guide.hand.from.y) * hand.travel
  ctx.save()
  ctx.globalAlpha = hand.opacity * 0.92
  ctx.translate(x + 8, y + 12 - 10 * hand.press)
  ctx.rotate(-0.5)
  const size = 1 - 0.08 * hand.press
  ctx.scale(size, size)
  inked(ctx, slab(-12, -6, 24, 62, 12), WHITE, 5)
  inked(ctx, slab(-30, 40, 62, 58, 20), WHITE, 5)
  inked(ctx, slab(-34, 84, 70, 22, 8), RED, 5)
  ctx.restore()
  return 3
}

/** One frame of the game, on top of the plate. Returns the figures drawn. */
export function paintFrame(ctx: Ctx, dots: Dots, scenery: Scenery): number {
  const { game, fx } = scenery
  // Whoever is going by in the street, behind everything at the stall; then the juice on the wall.
  let drawn = paintPassers(ctx, dots, scenery.time) + effects(ctx, fx, true)
  // The customer at the window, with its ticket; or one still on its way out.
  const departing = scenery.departing
  if (departing) {
    // The served customer on its way out, behind the one stepping up: turned about, its shut tin with it, and gone at the edge of the panel.
    const who = departing.customer.who, { s, room } = fitOf(departing.customer, 'window'), x = standsAt(who, 'window').x, file = wantedCount(departing.customer)
    const wide = who === 'ants' ? file * Math.min(44 * s, room / file) : 100 * s
    const exit = Math.max(x - WALL.x + wide, TIN_BY_FEET + 72 - WALL.x)
    const last = poseOf(departing.actor, who === 'twins' ? 1 : 0)
    ctx.save()
    ctx.beginPath()
    ctx.rect(WALL.x + 3, WALL.y + 3, WALL.w - 6, WALL.h - 6)
    ctx.clip()
    drawn += customerAt(ctx, dots, departing.customer, departing.actor, { feast: leavingFeast(departing.customer, departing.lengths, last.away) }, 'window', null, exit)
    inked(ctx, rect(TIN_BY_FEET - last.away * exit, SILL - 30 - last.hop, 64, 26), '#c9d6e6', 4, dots.of(ctx, BLUE, 0.3))
    ctx.restore()
    drawn++
  }
  const gliding = scenery.leaving
  const atWindow = game.window ?? (gliding?.whom === 'window' ? gliding.customer : null)
  let feasting: Feast | null = null
  if (atWindow) {
    const lengths = scenery.ending ? scenery.ending.result.parts.flatMap((part) => part.pieces.map((piece) => piece.length)) : eaten(game.world).map((piece) => piece.length)
    const feast = feastOf(atWindow, lengths, scenery.ending?.taste ?? null, scenery.show?.kind === 'showing' ? null : scenery.show, scenery.ending?.result.kind === 'over', scenery.ending?.outcome === 'badly')
    feasting = feast
    // A glider playing for a pelican that waits is that pelican's scene, not the scene of whoever stands at the window.
    drawn += customerAt(ctx, dots, atWindow, scenery.window, { feast, show: gliding && gliding.whom !== 'window' ? null : scenery.show }, 'window', scenery.finger)
    // The ticket is large and stands clear of whoever holds it: the cat's two are stacked.
    if (game.window) drawn += ticket(ctx, atWindow, WINDOW.x + 330, TICKET_TOP, atWindow.who === 'boa' ? 0.66 : atWindow.shares.length > 1 ? 0.72 : 1.1, atWindow.shares.length > 1)
    // Served, and the serve over: it holds its tin, shut, by its feet.
    if (game.finished && !scenery.ending) {
      inked(ctx, rect(TIN_BY_FEET, SILL - 30, 64, 26), '#c9d6e6', 4, dots.of(ctx, BLUE, 0.3))
      drawn++
    }
  }
  // The glider's last beat: one feather drifts down where the pelican stood.
  if (gliding && scenery.show && scenery.show.kind === 'glider' && scenery.show.feather > 0 && scenery.show.feather < 1) {
    const f = scenery.show.feather, from = standsAt('pelican', gliding.whom).x
    ctx.save()
    ctx.translate(from + 40 + 26 * Math.sin(f * Math.PI * 3), WALL.y + 50 + (WALL.h - 66) * f)
    ctx.rotate(0.7 * Math.cos(f * Math.PI * 3))
    inked(ctx, oval(0, 0, 15, 5), WHITE, 3)
    ctx.fillStyle = INK
    ctx.fillRect(-15, -1, 34, 2)
    ctx.restore()
    drawn += 2
  }
  game.queue.forEach((customer, at) => {
    const index = at as 0 | 1, box = QUEUE[index]
    // A pelican gliding out of the queue is drawn in its place until it has gone; the one who joins is seen after it.
    if (gliding && gliding.whom === index && scenery.show && scenery.show.away < 1) {
      drawn += customerAt(ctx, dots, gliding.customer, scenery.leavingActor, { show: scenery.show }, index)
      return
    }
    // The pelican and the cat stand beside their tickets, the cat's two stacked; the low ones (the twins, the ants, the boa) have theirs over their heads.
    const who = customer.who, long = who === 'boa', beside = who === 'pelican' || who === 'cat'
    drawn += customerAt(ctx, dots, customer, scenery.queue[index], {}, index, scenery.finger)
    drawn += ticket(ctx, customer, box.x + (long ? 8 : who === 'cat' ? 104 : beside ? 92 : 46), TICKET_TOP, long ? 0.5 : customer.shares.length > 1 ? 0.56 : 0.62, true)
  })
  drawn += awning(ctx, scenery.time, fx.flap)
  const slat = fx.fx.find((one) => one.kind === 'slat')
  drawn += crate(ctx, dots, fx.rock, game.window && !game.finished ? game.window.fruit : null, scenery.time, slat ? 1 - slat.age / slat.life : 0)
  // The tin on the rail. While the serve plays it is still there, shut on what was served, and empties as the
  // customer eats; what it held is read from the ending, since the game has already moved on.
  const serving = scenery.ending !== null && scenery.show !== null && scenery.show.kind !== 'glider' && game.window !== null
  const shape = tinAt(game) ?? (serving ? tinShape(tinParts(game.window!), WHOLE[game.window!.fruit], true) : null)
  // The tin jolts on its rail when it is poked, struck or skidded on.
  ctx.save()
  ctx.translate(fx.jolt * 5, 0)
  // In the serve the tin is lifted off its rail, and what is in it with it.
  const up = serving ? 26 * scenery.show!.lift : 0
  if (shape && game.window) drawn += tin(ctx, dots, scenery, shape, game.window, up, serving && feasting ? feasting.spin : 0)
  ctx.restore()
  if (serving && shape) {
    let eatenSoFar = 0
    scenery.ending!.result.parts.forEach((part, index) => {
      let x = shape.parts[index]?.x ?? shape.parts[0].x
      for (const piece of part.pieces) {
        const left = 1 - Math.max(0, Math.min(1, scenery.show!.bites - eatenSoFar))
        // Under a lid that has shut flat nothing shows; a lid that bounces on what sticks out leaves it in view.
        if (left > 0.02 && !(scenery.show!.lid >= 0.99 && scenery.ending!.result.kind !== 'over')) bar(ctx, piece.fruit, { x, y: TIN.bodyY + (TIN.bodyH - TIN.pieceH) / 2 - up, w: piece.length * PX * left, h: TIN.pieceH })
        x += piece.length * PX
        eatenSoFar++
        drawn++
      }
    })
  }
  if (scenery.guide && scenery.glow > 0.01) for (const box of scenery.guide.glow) drawn += glow(ctx, box, scenery.glow, scenery.time)
  const carried = scenery.carried
  const pieces = shown(game.world, shape)
  for (const { piece, box } of pieces) {
    if (carried?.ids.includes(piece.id)) continue
    const off = offsetOf(fx, piece.id, box)
    pieceBar(ctx, piece, box, off.dx, off.dy, off.squash)
    drawn++
  }
  drawn += effects(ctx, fx, false)
  dog(ctx, dots, MOUTH.x, DOG.y + 10, 1.05, scenery.dog)
  drawn += 12
  // The roller: in the hand, running the rail in a first showing, or on its hook.
  const show = scenery.show
  const running = show !== null && show.drop > 0 && show.fill <= 0 && shape !== null && game.window !== null
  const hook = { x: ROLLER.x + ROLLER.w / 2, y: ROLLER.y + 62 }
  const railAt = running ? { x: shape.ruler.x + (WHOLE[game.window!.fruit] * PX * show.ruled) / ruling(game.window!).rows[0].parts, y: TIN.rulerY - 6 } : null
  drawn += roller(ctx, dots, scenery.roller ?? (railAt && show ? { x: hook.x + (railAt.x - hook.x) * show.drop, y: hook.y + (railAt.y - hook.y) * show.drop } : hook))
  // What is in the hand is drawn last, lifted a little off the counter, with a hard shadow where it would fall.
  if (carried) {
    for (const { piece, box } of pieces) {
      if (!carried.ids.includes(piece.id)) continue
      ctx.fillStyle = INK
      ctx.fillRect(box.x + carried.dx + 5, box.y + carried.dy + 7, box.w, box.h)
      pieceBar(ctx, piece, box, carried.dx, carried.dy - 4, 0)
      drawn += 2
    }
  }
  if (scenery.blade) {
    // The hairline: where a cut would fall, straight across the rail, the board and the shelf.
    ctx.fillStyle = INK
    ctx.fillRect(scenery.blade.x - 1, TIN.bodyY - 8, 2, SHELF_BOX.y + SHELF_BOX.h - TIN.bodyY + 20)
    // The blade itself, under the finger: a bright wedge with a black back.
    ctx.save()
    ctx.translate(scenery.blade.x, scenery.blade.y)
    inked(ctx, (c) => { c.moveTo(0, 34); c.lineTo(-13, -30); c.lineTo(13, -30); c.closePath() }, WHITE, 4)
    inked(ctx, rect(-15, -44, 30, 16), INK, 0)
    ctx.restore()
    drawn += 3
  }
  if (scenery.guide && scenery.hand && scenery.hand.opacity > 0.01) drawn += ghostHand(ctx, scenery.guide, scenery.hand)
  return drawn
}
