import { poseOf, type Actor } from './cast'
import { drawCustomer, type Casting } from './castFigures'
import { feastOf, leavingFeast, wantedCount, type Feast } from './feast'
import { dog } from './figures'
import { LAMPS } from './decor'
import { CURL_FLIGHT, MOUTH, answering, flight, offsetOf, type FxState } from './fx'
import { SNACK_DOWN, type Scenery } from './gameRun'
import type { Guide } from './guide'
import type { HandPose } from './guidance'
import { BLUE, BOARD as BOARD_FILL, BOARD_EDGE, FLESH, INK, PAPER, RED, RIND, TINT, WHITE, YELLOW, burst, inked, panel, poly, rect, slab, speedLines, oval, type Screens } from './look'
import { FRUITS, WHOLE, giveOf, type Fruit } from './measure'
import { tinAt } from './moves'
import { signBetween, tinParts, wanted, type Customer } from './orders'
import { paintPassers } from './passersBy'
import { restShow } from './scenes'
import { ruling, served as lyingIn } from './serve'
import { SILL, fitOf, headOf, standsAt, ticketAt, ticketCards, type Seat } from './seats'
import { drawBags, drawBone, drawCloth, lightLamp, paintCounter, paintStreet } from './setting'
import { BOARD, COUNTER, CRATE, DOG, PX, ROLLER, SHELF_BOX, TIN, WALL, WINDOW, laneTop, rowTop, shown, tinShape, type Box, type Point, type TinShape } from './stage'
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

/** Everything that never moves: the two panels, the board, the shelf, the dog's arch and the roller's hook. Returns the figures drawn. */
export function paintPlate(ctx: Ctx, dots: Dots): number {
  // The stall's panel: the street behind, then the stall's own front. The counter's panel: worn wood and what lies about on it.
  panel(ctx, WALL.x, WALL.y, WALL.w, WALL.h, PAPER, dots.of(ctx, BLUE, 0.2))
  let drawn = paintStreet(ctx, dots)
  inked(ctx, rect(WALL.x, WALL.y, WALL.w, WALL.h), null, 6)
  panel(ctx, COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h, PAPER, dots.of(ctx, YELLOW, 0.22))
  drawn += paintCounter(ctx)
  inked(ctx, rect(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h), null, 6)
  // The board and the shelf: plain pale slabs with a hard shadow, and nothing on them but lines between the lanes.
  for (const box of [BOARD, SHELF_BOX]) {
    ctx.fillStyle = INK
    ctx.fillRect(box.x + 6, box.y + 6, box.w, box.h)
    inked(ctx, rect(box.x, box.y, box.w, box.h), BOARD_FILL, 5)
  }
  ctx.fillStyle = BOARD_EDGE
  ctx.fillRect(BOARD.x + 3, laneTop(0) - 7.5, BOARD.w - 6, 3)
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

function crate(ctx: Ctx, dots: Dots, rock: number, ordered: Fruit | null, time: number, split = 0, chew = 0): number {
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
  if (chew > 0) {
    // Given a piece, it chews: its top slat works up and down like a jaw, three times, before the burp.
    const gape = 16 * Math.abs(Math.sin(chew * Math.PI * 3))
    inked(ctx, poly([[4, 22], [CRATE.w - 4, 22], [CRATE.w - 10, 22 + gape], [10, 22 + gape]]), INK, 3)
  }
  if (split > 0) {
    // The top slat, split by the blade: a dark wedge where the wood has parted, closing again as it mends.
    inked(ctx, poly([[CRATE.w / 2 - 20 * split, 22], [CRATE.w / 2 + 22 * split, 22], [CRATE.w / 2 + 7 * split, 22 + 38 * split], [CRATE.w / 2 - 6 * split, 22 + 24 * split]]), INK, 3)
  }
  ctx.restore()
  return 7
}

/** The roller: a drum on two cords. It hangs on its hook, or goes where the finger or a scene has it. */
function roller(ctx: Ctx, dots: Dots, at: Point): number {
  // A drum in a coat of dots with a dark cap at each end. It has no ridges across it: bars at even steps along a strip would read as a strip ruled into parts.
  inked(ctx, slab(at.x - 46, at.y - 20, 92, 40, 10), WHITE, 5, dots.of(ctx, BLUE, 0.4))
  inked(ctx, slab(at.x - 46, at.y - 20, 13, 40, 6), INK, 0)
  inked(ctx, slab(at.x + 33, at.y - 20, 13, 40, 6), INK, 0)
  return 3
}

function effects(ctx: Ctx, fx: FxState, wall: boolean): number {
  let drawn = 0
  for (const one of fx.fx) {
    if ((one.kind === 'spatter') !== wall || one.age < 0 || one.kind === 'lid' || one.kind === 'jaw' || one.kind === 'slat' || one.kind === 'answer' || one.kind === 'roll' || one.kind === 'chew' || one.kind === 'decor' || one.kind === 'kick') continue
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
function ticket(ctx: Ctx, customer: Customer, seat: Seat, sign: 'less' | 'equals' | 'greater' | null = null): number {
  const { s } = ticketAt(customer, seat), cards = ticketCards(customer, seat)
  const whole = (WHOLE[customer.fruit] / WHOLE.long) * 190 * s
  let drawn = 0
  for (const [index, share] of customer.shares.entries()) {
    const reach = Math.max(1, share.num / share.den)
    // The card is as wide as the whole fruits drawn on it: an order past one whole shows two. Where it stands is where a touch finds it (seats.ts).
    const { x: left, y, w, h } = cards[index]
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
    // The cat's two tickets side by side, in the order it holds them: once the truth has been shown, the sign for less than, equal or
    // greater than stands between the two strips, so it reads as it stands, the first share on its left and the second on its right.
    if (sign && share === customer.shares[0]) drawSign(ctx, sign, left + w + 17, sy + tall / 2, 24, { fill: INK, edge: WHITE, edgeWidth: 5 })
    drawn += 6
  }
  return drawn
}

/** The tin on the rail. Shut, it is folded small. Open, it is exactly as long as the order, with its lid standing behind it and the whole fruit ruled into its parts on the strip under it. */
function tin(ctx: Ctx, dots: Dots, scenery: Scenery, shape: TinShape, customer: Customer, up = 0, spin = 0, jaws: Box[] = []): number {
  const { body, lid, ruler } = shape
  if (!shape.open) {
    // Folded, it says nothing of how long the order is: a small shut box with a clasp. It has no creases across it, which would read as a strip ruled into parts.
    inked(ctx, rect(body.x, body.y, body.w, body.h), '#c9d6e6', 5, dots.of(ctx, BLUE, 0.3))
    inked(ctx, slab(body.x + body.w / 2 - 11, body.y + body.h / 2 - 9, 22, 18, 6), YELLOW, 3)
    return 2
  }
  const show = scenery.show
  const ruled = ruling(customer)
  const share = wanted(customer)
  const showing = show !== null && show.drop > 0 && show.fill < 1
  // Every part along the rail is ruled, past the first whole fruit too where the order is longer than one; in a first showing, as far as the roller has got.
  const partsRuled = showing ? show.ruled : Infinity
  const fill = showing ? show.fill : 1
  // The lid, standing open behind the tin, as long as the tin, with the fraction on it. In the serve it comes
  // down: flat on a fit, and bouncing on what sticks out.
  const closing = show !== null && show.kind === 'serve' && scenery.ending !== null ? show.lid : 0
  // A lid that will not shut: on what sticks out it bounces; on a gap it comes down, finds nothing to hold it and springs back open. Only a fit shuts it.
  const how = closing > 0 ? scenery.ending!.result.kind : 'fit'
  const bounce = how === 'over' ? 0.35 + 0.25 * Math.abs(Math.sin(closing * Math.PI * 3)) : how === 'under' ? (closing > 0 ? Math.sin(closing * Math.PI) / closing : 1) * 0.92 : 1
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
      // It comes down inside the tin from its top edge. Before it has started there is nothing of it: a short upright bar standing on the
      // edge would lie over the lid, against the fraction there, and read as a digit.
      if (drop > 0) ctx.fillRect(part.x + part.w - 2, body.y, 4, body.h * drop)
      return
    }
    // The jaw is a thick wall across the end of the compartment, exactly where the order ends; as it snaps it jumps out past the tin's end
    // and back. It is sprung, with a little give: over a piece that is too short it closes on air, by its give and no further, and springs
    // back; and on a fit it takes up the slack, standing at the end of what was served.
    // It closes on air only when the compartment it ends is the short one.
    const shortHere = scenery.ending === null && lyingIn(scenery.game.world, customer).parts[index]?.fit.kind === 'under'
    const onAir = tried && tried.kind === 'lid' && tried.how === 'under' && shortHere ? giveOf(customer.fruit) * PX * Math.sin(t * Math.PI) : 0
    const served = scenery.ending && !scenery.ending.fed && scenery.ending.result.kind === 'fit' ? scenery.ending.result.parts[index] : undefined
    const slack = served ? (served.total - served.ordered) * PX * Math.min(1, closing * 2) : 0
    ctx.fillStyle = INK
    ctx.fillRect(part.x + part.w + 18 * bite - onAir + slack, body.y + 3, 7, body.h - 6)
    // The same wall is drawn again once the pieces are down, in front of them, so that a piece that is too long is seen to pass the jaw
    // and stick out beyond it by exactly its excess.
    if (spin === 0) jaws.push({ x: part.x + part.w + 18 * bite - onAir + slack, y: body.y + 3 - up, w: 7, h: body.h - 6 })
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
    for (let part = 1; part < marks; part++) {
      if (part > partsRuled + 0.001) continue
      // Where one whole fruit ends and the next begins the mark is heavier and taller than a part's: the whole is ruled on the rail too.
      const whole2 = part % row.parts === 0
      ctx.fillRect(ruler.x + (whole * part) / row.parts - (whole2 ? 2.5 : 1.25), y - (ruled.rows.length > 1 ? 0 : whole2 ? 8 : 3), whole2 ? 5 : 2.5, rowH + (ruled.rows.length > 1 ? 0 : whole2 ? 16 : 6))
    }
  })
  // The roller on the open tin: the ruled parts answer one by one, each standing up white for its knock.
  const answering = scenery.fx.fx.find((one) => one.kind === 'answer')
  if (answering && answering.kind === 'answer') {
    const parts = ruled.rows[0].parts, at = Math.min(answering.parts - 1, Math.floor((answering.age / answering.life) * answering.parts))
    // The part that answers stands up where it lies on the rail, in the second fruit as in the first.
    inked(ctx, rect(ruler.x + (whole * at) / parts, ruler.y - 7, whole / parts, rowH * ruled.rows.length + 10), WHITE, 3)
  }
  return 8 + 4 * ruled.rows.length
}

/**
 * A customer standing in its seat with its feet on the sill. While a finger is down its eyes follow the finger,
 * whatever else it is doing.
 */
function customerAt(ctx: Ctx, dots: Dots, customer: Customer, actor: Actor | null, cast: Partial<Casting>, seat: Seat, finger: Point | null = null, exit = 0): number {
  if (!actor) return 0
  const { x, y } = standsAt(customer.who, seat), { s, room } = fitOf(customer, seat)
  const head = headOf(customer, seat)
  const watch = finger ? { x: Math.max(-1, Math.min(1, (finger.x - head.x) / 260)), y: Math.max(-1, Math.min(1, (finger.y - head.y) / 200)) } : null
  const full: Casting = {
    who: customer.who,
    fruit: customer.fruit,
    pose: watch ? (member) => ({ ...poseOf(actor, member), eyeX: watch.x, eyeY: watch.y }) : (member) => poseOf(actor, member),
    feast: cast.feast ?? feastOf(customer, [], null, null),
    show: cast.show ?? null,
    beak: cast.beak,
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
  let drawn = paintPassers(ctx, dots, scenery.time, (kind) => answering(fx, kind))
  // A street lamp that has been tapped lights, and goes out again.
  LAMPS.forEach((at, index) => {
    const lit = answering(fx, 'lamp', index)
    if (lit >= 0) drawn += lightLamp(ctx, dots, at, lit < 0.15 ? lit / 0.15 : 1 - (lit - 0.15) / 0.85)
  })
  drawn += effects(ctx, fx, true)
  // What the stall keeper leaves about. Tapped, the cloth swings on its peg and the paper bags rustle.
  const swing = answering(fx, 'cloth'), rustle = answering(fx, 'bags')
  drawn += drawCloth(ctx, dots, swing < 0 ? 0 : 12 * Math.sin(swing * Math.PI * 3) * (1 - swing))
  drawn += drawBags(ctx, dots, rustle < 0 ? 0 : 10 * Math.abs(Math.sin(rustle * Math.PI * 2)) * (1 - rustle))
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
    drawn += customerAt(ctx, dots, departing.customer, departing.actor, { feast: leavingFeast(departing.customer, departing.lengths, last.away, departing.fruits, departing.sides) }, 'window', null, exit)
    inked(ctx, rect(TIN_BY_FEET - last.away * exit, SILL - 30 - last.hop, 64, 26), '#c9d6e6', 4, dots.of(ctx, BLUE, 0.3))
    ctx.restore()
    drawn++
  }
  const gliding = scenery.leaving
  const atWindow = game.window ?? (gliding?.whom === 'window' ? gliding.customer : null)
  let feasting: Feast | null = null
  if (atWindow) {
    // What is inside it: while a serve from the tin plays, what the ending says it ate; otherwise, and for one fed by hand, what the game holds,
    // which is every piece it was fed, a piece of another fruit and the rest of a row included.
    const byHand = scenery.ending !== null && scenery.ending.fed
    // Outside a serve, a piece that is still in the air from the hand is not inside it yet.
    const inside = scenery.ending && !byHand ? scenery.ending.result.parts.flatMap((part) => part.pieces) : byHand ? eaten(game.world) : eaten(game.world).slice(0, Math.max(0, eaten(game.world).length - scenery.inAir))
    // A scene that is somebody else's (the glider of a pelican that waits) is not this customer's: it stays in its last pose, with all it ate.
    // The window's own show: a glider playing for a pelican that waits is not it (`scenery.glide`).
    const mine = scenery.show
    const own = mine
    const feast = feastOf(atWindow, inside.map((piece) => piece.length), scenery.ending?.taste ?? null, own?.kind === 'showing' ? null : own, !byHand && scenery.ending?.result.kind === 'over', scenery.ending?.outcome === 'badly', inside.map((piece) => piece.fruit), inside.map((piece) => (piece.place.on === 'tin' || piece.place.on === 'eaten' ? piece.place.part : 0)))
    feasting = feast
    // A glider playing for a pelican that waits is that pelican's scene, not the scene of whoever stands at the window.
    drawn += customerAt(ctx, dots, atWindow, scenery.window, { feast, show: scenery.show, beak: gliding && gliding.whom === 'window' ? gliding.fruit : undefined }, 'window', scenery.finger)
    // The ticket is large and stands clear of whoever holds it. The cat's two stand side by side, and the sign is laid between them once
    // its tin has opened, or it has been served: after the child's cut, never before, and in a first showing as the last thing shown.
    const ruling2 = scenery.show !== null && scenery.show.drop > 0 && scenery.show.fill < 1
    // It needs the ruling under it: no sign for a cat fed by hand whose tin never opened, and none in a first showing until the parts are ruled and filled.
    const signNow = atWindow.shares.length > 1 && game.world.tinOpen && !ruling2 ? signBetween(atWindow) : null
    if (game.window) drawn += ticket(ctx, atWindow, 'window', signNow)
    // Served, and the serve over: it holds its tin, shut, by its feet. One fed by hand has had it there from the first.
    if (game.finished && (!scenery.ending || scenery.ending.fed)) {
      // While the twins pull a piece between them the tin spins about its own length, here by their feet as it does on the rail.
      const turned = Math.abs(Math.cos(feast.spin)), tall = Math.max(4, 26 * turned)
      inked(ctx, rect(TIN_BY_FEET, SILL - 17 - tall / 2, 64, tall), '#c9d6e6', 4, dots.of(ctx, BLUE, 0.3))
      drawn++
    }
  }
  // The glider's last beat: one feather drifts down where the pelican stood.
  if (gliding && scenery.glide && scenery.glide.feather > 0 && scenery.glide.feather < 1) {
    const f = scenery.glide.feather, from = standsAt('pelican', gliding.whom).x
    ctx.save()
    ctx.translate(from + 40 + 26 * Math.sin(f * Math.PI * 3), WALL.y + 50 + (WALL.h - 66) * f)
    ctx.rotate(0.7 * Math.cos(f * Math.PI * 3))
    // A feather is one pointed leaf with a notch in its edge: nothing is drawn through it.
    inked(ctx, poly([[-18, 0], [-6, -6], [8, -5], [18, 0], [9, 2], [10, 5], [2, 4], [-8, 5]]), WHITE, 2.5)
    ctx.restore()
    drawn += 2
  }
  game.queue.forEach((customer, at) => {
    const index = at as 0 | 1
    // A pelican gliding out of the queue is drawn in its place until it has gone; the one who joins is seen after it.
    if (gliding && gliding.whom === index && scenery.glide && scenery.glide.away < 1) {
      drawn += customerAt(ctx, dots, gliding.customer, scenery.leavingActor, { show: scenery.glide, beak: gliding.fruit }, index)
      return
    }
    // The pelican and the cat stand beside their tickets, the cat's two stacked; the low ones (the twins, the ants, the boa) have theirs over their heads (seats.ts).
    // What it was given by hand shows in its body as it goes down, each piece at its own length and in its own colour, and for a few seconds after.
    const given = scenery.snacks.filter((one) => one.whom === index)
    const snack = given.length > 0 ? feastOf(customer, given.map((one) => one.length), null, { ...restShow('serve'), lid: 1, lift: 1, bites: given.reduce((sum, one) => sum + Math.min(1, one.age / SNACK_DOWN), 0) }, false, false, given.map((one) => one.fruit)) : undefined
    drawn += customerAt(ctx, dots, customer, scenery.queue[index], snack ? { feast: snack } : {}, index, scenery.finger)
    drawn += ticket(ctx, customer, index)
  })
  drawn += awning(ctx, scenery.time, fx.flap)
  const slat = fx.fx.find((one) => one.kind === 'slat'), chewing = fx.fx.find((one) => one.kind === 'chew')
  // The kind a tap will bring stands up out of the crate: the kind on the ticket at the window, for as long as a customer stands there.
  drawn += crate(ctx, dots, fx.rock, game.window ? game.window.fruit : null, scenery.time, slat ? 1 - slat.age / slat.life : 0, chewing ? Math.max(0.001, chewing.age / chewing.life) : 0)
  // The tin on the rail. While the serve plays it is still there, shut on what was served, and empties as the
  // customer eats; what it held is read from the ending, since the game has already moved on.
  // A customer fed by hand is served past its tin: there is none on the rail for its serve.
  const serving = scenery.ending !== null && !scenery.ending.fed && scenery.show !== null && scenery.show.kind !== 'glider' && game.window !== null
  const shape = tinAt(game) ?? (serving ? tinShape(tinParts(game.window!), WHOLE[game.window!.fruit], true) : null)
  // The tin jolts on its rail when it is poked, struck or skidded on.
  ctx.save()
  ctx.translate(fx.jolt * 5, 0)
  // In the serve the tin is lifted off its rail, and what is in it with it.
  const up = serving ? 26 * scenery.show!.lift : 0
  const jaws: Box[] = []
  if (shape && game.window) drawn += tin(ctx, dots, scenery, shape, game.window, up, serving && feasting ? feasting.spin : 0, jaws)
  ctx.restore()
  if (serving && shape) {
    let eatenSoFar = 0
    // As they lay before the send-off: each compartment's pieces from its own left end, or from where the one before it ends when that sticks out.
    let end = -Infinity
    scenery.ending!.result.parts.forEach((part, index) => {
      let x = Math.max(shape.parts[index]?.x ?? shape.parts[0].x, end)
      end = x + part.pieces.reduce((sum, piece) => sum + piece.length * PX, 0)
      for (const piece of part.pieces) {
        const left = 1 - Math.max(0, Math.min(1, scenery.show!.bites - eatenSoFar))
        // Under a lid that has shut flat nothing shows; a lid that bounces on what sticks out leaves it in view.
        if (left > 0.02 && !(scenery.show!.lid >= 0.99 && scenery.ending!.result.kind === 'fit')) bar(ctx, piece.fruit, { x, y: TIN.bodyY + (TIN.bodyH - TIN.pieceH) / 2 - up, w: piece.length * PX * left, h: TIN.pieceH })
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
    if (off.unseen) continue
    pieceBar(ctx, piece, box, off.dx, off.dy, off.squash)
    drawn++
  }
  // The jaw, in front of whatever lies in the tin.
  ctx.fillStyle = INK
  for (const jaw of jaws) ctx.fillRect(jaw.x + fx.jolt * 5, jaw.y, jaw.w, jaw.h)
  drawn += effects(ctx, fx, false)
  dog(ctx, dots, MOUTH.x, DOG.y + 10, 1.05, scenery.dog)
  // The dog's bone. Tapped, it jumps and turns over, and the dog looks down at it.
  const jump = answering(fx, 'bone')
  drawn += drawBone(ctx, jump < 0 ? 0 : 16 * Math.sin(jump * Math.PI), jump < 0 ? 0 : jump * Math.PI)
  drawn += 12
  // The roller: in the hand, running the rail in a first showing, or on its hook.
  const show = scenery.show
  const running = show !== null && show.drop > 0 && show.fill <= 0 && shape !== null && game.window !== null
  const hook = { x: ROLLER.x + ROLLER.w / 2, y: ROLLER.y + 62 }
  const railAt = running ? { x: shape.ruler.x + (WHOLE[game.window!.fruit] * PX * show.ruled) / ruling(game.window!).rows[0].parts, y: TIN.rulerY - 6 } : null
  // Let go on something, it is seen rolling along that before it is back on its cords.
  const rolling = fx.fx.find((one) => one.kind === 'roll')
  const along = rolling && rolling.kind === 'roll' ? { x: rolling.x0 + (rolling.x1 - rolling.x0) * (rolling.age / rolling.life), y: rolling.y } : null
  drawn += roller(ctx, dots, scenery.roller ?? along ?? (railAt && show ? { x: hook.x + (railAt.x - hook.x) * show.drop, y: hook.y + (railAt.y - hook.y) * show.drop } : hook))
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
    // It starts at the tin's body, under the lid: a thin upright stroke in the lid would stand against the fraction there.
    ctx.fillRect(scenery.blade.x - 1, TIN.bodyY, 2, SHELF_BOX.y + SHELF_BOX.h - TIN.bodyY + 12)
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
