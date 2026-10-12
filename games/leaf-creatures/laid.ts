import { HEAPS } from './clearing'
import { MANNERS, type Kind } from './parts'
import { eyeKey, gazeOf, partKey, type Pen } from './pen'
import type { Part, Thing } from './things'

// A part that lies on the earth or is on its way there, as it is drawn: the
// same strokes whether it is drawn live in a frame or stamped into the kept
// picture of the place (painter.ts).

/** How a part that has just touched down rings out, each kind in its own way: `s` goes from 1 at the touch to 0. */
export function settleOf(kind: Kind, s: number, out: { turn: number; sx: number; sy: number; up: number }): void {
  out.turn = 0; out.sx = 1; out.sy = 1; out.up = 0
  if (s <= 0) return
  switch (kind) {
    case 'twig': out.turn = 0.12 * s * Math.sin(s * 40); break
    case 'maple': out.sy = 1 - 0.3 * s * Math.cos(s * 7); out.sx = 1 + 0.08 * s; break
    case 'willow': out.sx = 1 - 0.22 * s; break
    case 'round': out.turn = 5 * s * s; out.sy = 1 - 0.5 * s; break
    case 'feather': out.turn = 0.09 * s * Math.sin(s * 50); out.up = 5 * s; break
    case 'seed': out.up = 12 * s * Math.abs(Math.cos(s * 3)); break
    case 'cap': out.sx = 1 + 0.26 * s * Math.cos(s * 8); out.sy = 1 + 0.26 * s * Math.cos(s * 8); break
  }
}
const settled = { turn: 0, sx: 1, sy: 1, up: 0 }

/** A part of a thing that lies on the earth, or is on its way there. The same strokes whether it is drawn live or into the picture of the place. */
export function drawLaid(pen: Pen, thing: Thing, part: Part, peeking: boolean): void {
  if (part.inHand) return
  const c = Math.cos(thing.turn), s = Math.sin(thing.turn)
  let x = thing.x + part.x * c - part.y * s, y = thing.y + part.x * s + part.y * c, turn = thing.turn + part.turn, size = 1
  if (part.fall > 0 && part.flight > 0) {
    // Through the air by itself: an arc from where it was, turning as it comes.
    const u = 1 - part.fall / part.flight, e = u * u * (3 - 2 * u)
    const fx = thing.x + part.fromX * c - part.fromY * s, fy = thing.y + part.fromX * s + part.fromY * c
    x = fx + (x - fx) * e; y = fy + (y - fy) * e - Math.sin(u * Math.PI) * 96
    turn += (1 - e) * 3.4
    size = 1 + 0.22 * Math.sin(u * Math.PI)
  } else if (part.fall > 0) {
    const k = part.fall / MANNERS[part.kind].fall
    y -= 14 * k
    size = 1 + 0.1 * k
  }
  settleOf(part.kind, part.settle, settled)
  if (part.kind === 'cap' && peeking && part.fall === 0) {
    // One cap on a thing that still sleeps: an eye open a crack, looking at the heap of caps for its fellow.
    pen.stamp(eyeKey(part.look, gazeOf(HEAPS.cap.x - x, HEAPS.cap.y - y)), x, y - settled.up, 0, settled.sx, settled.sy)
    pen.stamp(partKey('cap', part.look), x, y - 14 - settled.up, turn, settled.sx, 0.56 * settled.sy)
    return
  }
  pen.stamp(partKey(part.kind, part.look), x, y - settled.up, turn + settled.turn, size * settled.sx, size * settled.sy)
}

/** Whether a part of a thing lies still: it is then part of the picture of the place and is not drawn live. */
export function lyingStill(part: Part): boolean {
  return !part.inHand && part.fall === 0 && part.settle === 0 && part.bounces === 0
}
