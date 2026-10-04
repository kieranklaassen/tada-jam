import { BLUE, PAPER, RED, WHITE, YELLOW, GREEN, type Screens } from './look'
import { WALL } from './stage'
import { passersAt, type Passer } from './street'

// The passers-by of street.ts, drawn as far things are drawn: thin blue line,
// flat pale fills, a little dot, and all of it half faded into the paper, so
// that nothing in the street is ever as dark as a customer or as plain as a
// fruit. They walk behind the stall, between the houses and whoever stands at
// it. Nothing about when or where they walk is decided here.

type Ctx = CanvasRenderingContext2D
type Dots = Pick<Screens, 'of'>

/** The line every foot in the street walks on: far enough up the panel for the feet to show over the sill. */
const GROUND = WALL.y + WALL.h - 24

function far(ctx: Ctx, path: (c: Ctx) => void, fill: string | null, screen?: CanvasPattern | string): void {
  ctx.beginPath()
  path(ctx)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (screen) {
    ctx.fillStyle = screen
    ctx.fill()
  }
  ctx.stroke()
}

/** Two legs in mid-stride from a hip: one forward as the other is back. */
function legs(ctx: Ctx, x: number, hip: number, stride: number, reach: number): void {
  const swing = Math.sin(stride) * reach
  ctx.beginPath()
  ctx.moveTo(x, hip)
  ctx.lineTo(x + swing, GROUND)
  ctx.moveTo(x, hip)
  ctx.lineTo(x - swing, GROUND)
  ctx.stroke()
}

/** A walker: a coat, a head, a hat brim, legs. Returns the top of its head. */
function walker(ctx: Ctx, dots: Dots, x: number, tall: number, stride: number, coat: string, tone: number): number {
  const bob = 1.5 * Math.abs(Math.sin(stride)), hip = GROUND - tall * 0.42, neck = GROUND - tall * 0.86 - bob
  legs(ctx, x, hip, stride, tall * 0.16)
  far(ctx, (c) => { c.moveTo(x - tall * 0.13, neck); c.lineTo(x + tall * 0.13, neck); c.lineTo(x + tall * 0.19, hip + 4); c.lineTo(x - tall * 0.19, hip + 4); c.closePath() }, WHITE, dots.of(ctx, coat, tone))
  far(ctx, (c) => c.ellipse(x, neck - tall * 0.09, tall * 0.085, tall * 0.1, 0, 0, Math.PI * 2), PAPER)
  far(ctx, (c) => { c.moveTo(x - tall * 0.14, neck - tall * 0.15); c.lineTo(x + tall * 0.14, neck - tall * 0.15); c.lineTo(x + tall * 0.07, neck - tall * 0.24); c.lineTo(x - tall * 0.07, neck - tall * 0.24); c.closePath() }, WHITE, dots.of(ctx, BLUE, 0.4))
  return neck - tall * 0.24
}

function umbrella(ctx: Ctx, dots: Dots, one: Passer): number {
  const top = walker(ctx, dots, one.x, 74, one.stride, BLUE, 0.3)
  const hand = { x: one.x + one.dir * 12, y: GROUND - 44 }
  ctx.beginPath()
  ctx.moveTo(hand.x, hand.y)
  ctx.lineTo(hand.x, top - 20)
  ctx.stroke()
  // The canopy's lower edge is three scallops, not a straight bar for the shaft to stand under.
  far(ctx, (c) => { c.moveTo(hand.x - 34, top - 18); c.quadraticCurveTo(hand.x, top - 54, hand.x + 34, top - 18); c.quadraticCurveTo(hand.x + 23, top - 28, hand.x + 11, top - 18); c.quadraticCurveTo(hand.x, top - 28, hand.x - 11, top - 18); c.quadraticCurveTo(hand.x - 23, top - 28, hand.x - 34, top - 18) }, WHITE, dots.of(ctx, RED, 0.3))
  return 6
}

/** A small person leading a dog that is far too long: it has a third pair of legs in the middle, and they all keep step. */
function longDog(ctx: Ctx, dots: Dots, one: Passer): number {
  const front = one.x + one.dir * 150, back = one.x - one.dir * 150, belly = GROUND - 20
  const leader = one.x + one.dir * 178
  walker(ctx, dots, leader, 56, one.stride * 1.3, YELLOW, 0.4)
  // The lead, from a hand to the collar.
  ctx.beginPath()
  ctx.moveTo(leader - one.dir * 8, GROUND - 30)
  ctx.lineTo(front - one.dir * 4, belly - 12)
  ctx.stroke()
  for (const [at, lag] of [[front - one.dir * 22, 0], [one.x, 2.1], [back + one.dir * 22, 4.2]] as const) legs(ctx, at, belly + 6, one.stride + lag, 6)
  far(ctx, (c) => { c.moveTo(back, belly - 13); c.lineTo(front, belly - 13); c.quadraticCurveTo(front + one.dir * 14, belly, front, belly + 10); c.lineTo(back, belly + 10); c.quadraticCurveTo(back - one.dir * 14, belly, back, belly - 13) }, WHITE, dots.of(ctx, RED, 0.22))
  // The head, a long nose, and one ear that swings as it goes.
  far(ctx, (c) => { c.moveTo(front - one.dir * 4, belly - 12); c.lineTo(front + one.dir * 10, belly - 26); c.lineTo(front + one.dir * 40, belly - 16); c.lineTo(front + one.dir * 40, belly - 9); c.lineTo(front + one.dir * 8, belly - 2); c.closePath() }, WHITE, dots.of(ctx, RED, 0.22))
  far(ctx, (c) => c.ellipse(front + one.dir * 8, belly - 14 + 2 * Math.sin(one.stride * 2), 5, 10, one.dir * 0.3, 0, Math.PI * 2), PAPER, dots.of(ctx, BLUE, 0.5))
  // The tail, straight up at the far end of it, long after the rest has gone by.
  ctx.beginPath()
  ctx.moveTo(back - one.dir * 6, belly - 6)
  ctx.quadraticCurveTo(back - one.dir * 20, belly - 16, back - one.dir * 16 + 3 * Math.sin(one.stride * 3), belly - 32)
  ctx.stroke()
  return 12
}

function barrow(ctx: Ctx, dots: Dots, one: Passer): number {
  const pusher = one.x - one.dir * 40
  walker(ctx, dots, pusher, 70, one.stride, RED, 0.25)
  const tray = one.x + one.dir * 14, y = GROUND - 22
  // The handles, from the hands to the tray; the tray; the one wheel, as a flat disc of dots.
  ctx.beginPath()
  ctx.moveTo(pusher + one.dir * 10, GROUND - 36)
  ctx.lineTo(tray - one.dir * 26, y)
  ctx.stroke()
  far(ctx, (c) => { c.moveTo(tray - one.dir * 30, y - 8); c.lineTo(tray + one.dir * 34, y - 8); c.lineTo(tray + one.dir * 22, y + 10); c.lineTo(tray - one.dir * 22, y + 10); c.closePath() }, WHITE, dots.of(ctx, YELLOW, 0.4))
  ctx.beginPath()
  ctx.arc(tray + one.dir * 26, GROUND - 7, 7, 0, Math.PI * 2)
  ctx.fillStyle = dots.of(ctx, BLUE, 0.6)
  ctx.fill()
  // A heap of fruit, three kinds, jolting a little as it rolls.
  const jolt = 1.2 * Math.abs(Math.sin(one.stride * 2))
  for (const [dx, dy, colour] of [[-12, -15, RED], [8, -16, YELLOW], [-2, -26, GREEN]] as const) far(ctx, (c) => c.ellipse(tray + one.dir * dx, y + dy - jolt, 12, 9, 0, 0, Math.PI * 2), WHITE, dots.of(ctx, colour, 0.45))
  return 9
}

/** Whoever is in the street now, behind everyone at the stall. Returns the figures drawn. */
export function paintPassers(ctx: Ctx, dots: Dots, time: number): number {
  const passing = passersAt(time)
  if (passing.length === 0) return 0
  let drawn = 0
  ctx.save()
  ctx.beginPath()
  ctx.rect(WALL.x + 16, WALL.y + 3, WALL.w - 32, WALL.h - 6)
  ctx.clip()
  ctx.globalAlpha = 0.62
  ctx.lineWidth = 2.2
  ctx.strokeStyle = BLUE
  ctx.lineJoin = ctx.lineCap = 'round'
  for (const one of passing) drawn += one.kind === 'umbrella' ? umbrella(ctx, dots, one) : one.kind === 'longDog' ? longDog(ctx, dots, one) : barrow(ctx, dots, one)
  ctx.restore()
  return drawn
}
