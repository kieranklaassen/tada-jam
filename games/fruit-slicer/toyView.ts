import type { DogPose } from './dogMotion'
import { dog } from './figures'
import { MOUTH, flight, offsetOf, type FxState } from './fx'
import type { Guide } from './guide'
import type { HandPose } from './guidance'
import { BLUE, BOARD as BOARD_FILL, BOARD_EDGE, FLESH, INK, PAPER, RED, RIND, WHITE, YELLOW, burst, inked, oval, panel, rect, slab, speedLines, type Screens } from './look'
import { FRUITS } from './measure'
import { BOARD, COUNTER, CRATE, DOG, SHELF_BOX, WALL, laneTop, rowTop, shown, type Box, type Point } from './stage'
import { SHELF, type World } from './world'

// How the toy is drawn, in the look: comic-book halftone. Everything still is
// painted once onto a plate; a frame stamps the plate and draws what moves on
// top. The fruit and its pieces stay flat, on a plain board and a plain shelf;
// the dots are on the wall, the counter, the crate and the dog.
//
// Both painters take the context they draw on and count the figures they
// draw, so a test can run them on a stand-in and hold a frame to a budget.

type Ctx = CanvasRenderingContext2D
type Dots = Pick<Screens, 'of'>

/** What one frame shows. Points and boxes are in stage units. */
export type Frame = {
  /** The counter as it is, or nothing while the saved state is still being read. */
  world: World | null
  fx: FxState
  dog: DogPose
  /** Attended seconds: the awning sways on these. */
  time: number
  /** The blade under the finger, while a finger is down. */
  blade: Point | null
  /** The idle ladder: how strongly the next thing glows, and the ghost hand when it is showing a move. */
  glow: number
  guide: Guide | null
  hand: HandPose | null
}

const SCALLOPS = 16

/** Everything that never moves: the two panels, the board, the shelf and the dark hatch the dog looks out of. Returns the figures drawn. */
export function paintPlate(ctx: Ctx, screens: Dots): number {
  panel(ctx, WALL.x, WALL.y, WALL.w, WALL.h, PAPER, screens.of(ctx, BLUE, 0.2))
  panel(ctx, COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h, PAPER, screens.of(ctx, YELLOW, 0.22))
  // The board and the shelf: plain pale slabs with a hard shadow, and nothing on them but lines between the lanes.
  for (const box of [BOARD, SHELF_BOX]) {
    ctx.fillStyle = INK
    ctx.fillRect(box.x + 6, box.y + 6, box.w, box.h)
    inked(ctx, rect(box.x, box.y, box.w, box.h), BOARD_FILL, 5)
  }
  ctx.fillStyle = BOARD_EDGE
  ctx.fillRect(BOARD.x + 3, laneTop(0) - 9, BOARD.w - 6, 3)
  for (let slot = 1; slot < SHELF; slot++) ctx.fillRect(SHELF_BOX.x + 3, rowTop(slot) - 1.5, SHELF_BOX.w - 6, 3)
  // The dog's way up from under the counter: a dark arch with a pale sill, which the dog looks out of.
  inked(ctx, (c) => {
    c.moveTo(DOG.x + 6, DOG.y + DOG.h + 6)
    c.lineTo(DOG.x + 6, DOG.y + 84)
    c.arc(DOG.x + DOG.w / 2, DOG.y + 84, DOG.w / 2 - 6, Math.PI, 0)
    c.lineTo(DOG.x + DOG.w - 6, DOG.y + DOG.h + 6)
    c.closePath()
  }, INK, 5)
  inked(ctx, slab(DOG.x - 6, DOG.y + DOG.h, DOG.w + 12, 14, 5), WHITE, 4)
  return 10 + SHELF
}

/** A fruit or a piece: a flat colour, square ends and a thin darker line. A squash lowers it onto its own base; its length never changes. */
function bar(ctx: Ctx, fruit: (typeof FRUITS)[number], box: Box, dx = 0, dy = 0, squash = 0): void {
  const h = box.h * (1 - squash), y = box.y + dy + (box.h - h)
  ctx.fillStyle = FLESH[fruit]
  ctx.fillRect(box.x + dx + 1, y, box.w - 2, h)
  ctx.lineWidth = 3
  ctx.strokeStyle = RIND[fruit]
  ctx.strokeRect(box.x + dx + 2.5, y + 1.5, box.w - 5, h - 3)
}

function awning(ctx: Ctx, time: number, flap: number): number {
  const w = WALL.w / SCALLOPS
  for (let i = 0; i < SCALLOPS; i++) {
    // Each scallop hangs a little differently and they do not sway as one; a flap runs along them like a wave.
    const hang = 22 + 3 * Math.sin(time * 1.1 + i * 0.9) + 26 * flap * Math.sin(i * 0.8 + time * 7)
    const x = WALL.x + i * w
    inked(ctx, (c) => {
      c.moveTo(x, WALL.y)
      c.lineTo(x + w, WALL.y)
      c.lineTo(x + w, WALL.y + 12)
      c.ellipse(x + w / 2, WALL.y + 12, w / 2, Math.max(6, hang), 0, 0, Math.PI)
      c.closePath()
    }, i % 2 ? WHITE : RED, 4)
  }
  return SCALLOPS
}

function crate(ctx: Ctx, screens: Dots, rock: number): number {
  ctx.save()
  ctx.translate(CRATE.x + CRATE.w / 2, CRATE.y + CRATE.h)
  ctx.rotate(rock * 0.05)
  ctx.translate(-CRATE.w / 2, -CRATE.h)
  // The ends of three fruits show over the top slat: the crate is where fresh fruit comes from.
  FRUITS.forEach((fruit, i) => bar(ctx, fruit, { x: 14 + i * 40, y: -16 - 4 * i, w: 32, h: 40 + 4 * i }))
  inked(ctx, rect(0, 22, CRATE.w, CRATE.h - 22), '#d9a441', 5, screens.of(ctx, RED, 0.3))
  for (let slat = 1; slat < 3; slat++) inked(ctx, rect(0, 22 + (slat * (CRATE.h - 22)) / 3, CRATE.w, 0.01), null, 4)
  ctx.restore()
  return 6
}

function effects(ctx: Ctx, fx: FxState, wall: boolean): number {
  let drawn = 0
  for (const one of fx.fx) {
    if ((one.kind === 'spatter') !== wall) continue
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
      case 'curl': {
        const at = flight(one.fromX, one.fromY, t)
        ctx.beginPath()
        for (let i = 0; i <= 14; i++) {
          const a = i * 0.55 + t * 22, r = 3 + i * 0.9
          ctx.lineTo(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r)
        }
        ctx.lineWidth = 5
        ctx.strokeStyle = RIND[one.fruit]
        ctx.stroke()
        break
      }
      case 'fly': {
        // A piece dropping to the dog: it shrinks into the mouth, turning as it goes.
        const at = flight(one.from.x + one.from.w / 2, one.from.y + one.from.h / 2, t)
        const scale = 1 - 0.75 * t
        ctx.save()
        ctx.translate(at.x, at.y)
        ctx.rotate(t * 2.4)
        bar(ctx, one.fruit, { x: (-one.from.w * scale) / 2, y: (-one.from.h * scale) / 2, w: one.from.w * scale, h: one.from.h * scale })
        ctx.restore()
        break
      }
      case 'knock':
        for (let i = 0; i < 4; i++) speedLines(ctx, one.x, one.y, (i * Math.PI) / 2 + Math.PI / 4, 0, 8 + 14 * t, 20 + 14 * t, 1)
        break
    }
  }
  return drawn
}

/** The glow of the idle ladder, as the page would print it: a yellow band round the thing, and short rays off its corners. */
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

/** The ghost hand: a white glove with one finger out, pressing down as it strokes or taps. */
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

/** One frame of the toy, on top of the plate. Returns the figures drawn. */
export function paintFrame(ctx: Ctx, screens: Dots, frame: Frame): number {
  let drawn = effects(ctx, frame.fx, true)
  drawn += awning(ctx, frame.time, frame.fx.flap)
  drawn += crate(ctx, screens, frame.fx.rock)
  if (frame.world) {
    if (frame.guide && frame.glow > 0.01) drawn += glow(ctx, frame.guide.glow, frame.glow, frame.time)
    for (const { piece, box } of shown(frame.world)) {
      const off = offsetOf(frame.fx, piece.id, box)
      bar(ctx, piece.fruit, box, off.dx, off.dy, off.squash)
      drawn++
    }
  }
  drawn += effects(ctx, frame.fx, false)
  dog(ctx, screens, MOUTH.x, DOG.y + 10, 1.05, frame.dog)
  drawn += 12
  if (frame.blade) {
    // The hairline: where a cut would fall, straight across the board and the shelf.
    ctx.fillStyle = INK
    ctx.fillRect(frame.blade.x - 1, BOARD.y - 14, 2, SHELF_BOX.y + SHELF_BOX.h - BOARD.y + 28)
    // The blade itself, under the finger: a bright wedge with a black back.
    ctx.save()
    ctx.translate(frame.blade.x, frame.blade.y)
    inked(ctx, (c) => { c.moveTo(0, 34); c.lineTo(-13, -30); c.lineTo(13, -30); c.closePath() }, WHITE, 4)
    inked(ctx, rect(-15, -44, 30, 16), INK, 0)
    ctx.restore()
    drawn += 3
  }
  if (frame.guide && frame.hand && frame.hand.opacity > 0.01) drawn += ghostHand(ctx, frame.guide, frame.hand)
  return drawn
}
