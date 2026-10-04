// What the mouse on the cart does with a care thing (ART.md, "The scenes" and
// "The object-by-action grid"). Two lists, five and four entries, each its
// own: in its showing it uses a new thing on itself the right way (wraps a
// corner of the blanket round itself, brushes its whiskers, sticks a plaster
// on its tail, curls up in the basket and breathes out; the bowl has no
// showing, since at every position it counts as shown, and its use, a sip,
// is written all the same); and
// when the child puts a thing on it, that is mischief, and it reacts where it
// stands and the thing goes back to the cart. A plaster put on it stays, as
// its hat, and is not here.
//
// Everything is an offset from where the mouse stands (its feet), in the
// mouse's own drawing units: its nose is at (0, -58), its whiskers beside
// that, the tip of its tail at (44, -26), the top of its hat at -114.
// Pure: no renderer, no DOM, no clock.

import type { Care } from './needs'

export type MouseUse = {
  /** The mouse's own sticker: an offset, a tilt and a squash, with its eyes shut or its paws up at its whiskers. */
  mouse: { x: number; y: number; rot: number; sx: number; sy: number; shut: boolean; fuss: boolean }
  /** The thing: where it is, turned how, how large against its own drawing, and as which drawing. It is in front of the mouse. */
  thing: { x: number; y: number; rot: number; size: number; look: 'whole' | 'open' | 'one' }
  /** A breath out, 0 to 1: a small cloud leaves the nose. */
  breath: number
}

const TAU = Math.PI * 2
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (p: number) => { const c = clamp(p); return c * c * (3 - 2 * c) }
const up = (p: number) => Math.sin(Math.PI * clamp(p))
const span = (p: number, from: number, to: number) => clamp((p - from) / (to - from))
const STILL = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, shut: false, fuss: false } as const

/** The part of a showing during which the thing is at the mouse: before it the thing comes over, after it the thing goes back. */
export const USE = { from: 0.18, to: 0.82 } as const

/** How near the mouse the thing is, 0 on the cart and 1 at the mouse, `p` of the way through the showing. */
export function nearMouse(p: number): number {
  return smooth(p / USE.from) * (1 - smooth((p - USE.to) / (1 - USE.to)))
}

/** The mouse's showing of a thing, `p` of the way through: the use of the thing, on itself. */
export function showingUse(care: Care, p: number): MouseUse {
  const q = span(p, USE.from, USE.to)
  switch (care) {
    case 'bowl': {
      // It sips: the bowl stands at its feet, and it bends its nose down to the water three times.
      const dip = Math.abs(Math.sin(Math.PI * 3 * q))
      return { mouse: { ...STILL, x: -8 * dip, y: 4 * dip, rot: -0.46 * dip, sy: 1 - 0.07 * dip, shut: dip > 0.7 }, thing: { x: -42, y: -12, rot: 0, size: 0.5, look: 'whole' }, breath: 0 }
    }
    case 'blanket': {
      // It wraps a corner round itself: the cloth is over its shoulders to the chin, and it nestles from side to side in it.
      const nestle = Math.sin(TAU * 1.5 * q) * up(q)
      return { mouse: { ...STILL, rot: 0.08 * nestle, sx: 1 - 0.05 * up(q), sy: 1 - 0.03 * up(q), shut: q > 0.25 && q < 0.85 }, thing: { x: 3 * nestle, y: 4, rot: 0.08 * nestle, size: 0.29, look: 'open' }, breath: 0 }
    }
    case 'brush': {
      // It brushes its whiskers: the brush goes across its face one way and the other, and its head goes with each stroke.
      const stroke = Math.sin(TAU * 2.5 * q)
      return { mouse: { ...STILL, rot: 0.07 * stroke * up(q), fuss: true }, thing: { x: 30 * stroke, y: -50, rot: -0.25 * stroke, size: 0.38, look: 'whole' }, breath: 0 }
    }
    case 'plaster': {
      // It sticks a plaster on its tail: it turns to look, pats it on, and gives the tail a wag to see that it holds.
      const wag = q > 0.4 ? Math.sin(TAU * 3 * span(q, 0.4, 1)) * (1 - span(q, 0.4, 1)) : 0
      return { mouse: { ...STILL, rot: 0.2 * smooth(span(q, 0, 0.2)) * (1 - smooth(span(q, 0.85, 1))), sy: 1 - 0.05 * up(span(q, 0.15, 0.4)) }, thing: { x: 46 + 6 * wag, y: -27 - 3 * Math.abs(wag), rot: 0.95 + 0.4 * wag, size: 0.42, look: 'one' }, breath: 0 }
    }
    case 'basket': {
      // It hops in, curls up small, and breathes out.
      const hop = up(span(q, 0, 0.22)), curled = smooth(span(q, 0.22, 0.38)) * (1 - smooth(span(q, 0.9, 1))), breathing = Math.sin(TAU * 1.2 * q)
      return { mouse: { ...STILL, y: -26 * hop + 6 * curled, sx: 1 + 0.13 * curled + 0.02 * breathing * curled, sy: 1 - 0.33 * curled - 0.03 * breathing * curled, shut: curled > 0.5 }, thing: { x: 0, y: 2, rot: 0, size: 0.62, look: 'whole' }, breath: up(span(q, 0.5, 0.88)) }
    }
  }
}

/** How long the mouse's answer to a thing put on it lasts, in seconds. */
export const MISCHIEF_SECONDS = 1.9
/** From this part of it on, the thing is on its way back to the cart: the mouse puts it right. */
export const TIDIED_FROM = 0.78

/** The mouse's answer to a thing the child put on it, `p` of the way through: it reacts where it stands. */
export function mischief(care: Exclude<Care, 'plaster'>, p: number): MouseUse {
  const on = 1 - smooth(span(p, TIDIED_FROM, 1))
  switch (care) {
    case 'bowl': {
      // The bowl sits on its head, far too big: it sinks under it, staggers, and pushes it up and off.
      const stagger = Math.sin(TAU * 2.2 * p) * (1 - p)
      return { mouse: { ...STILL, x: 10 * stagger * on, rot: 0.1 * stagger * on, sy: 1 - 0.2 * on * (1 - up(span(p, 0.6, TIDIED_FROM)) * 0.6), shut: p < 0.3 }, thing: { x: 10 * stagger, y: -84 - 22 * up(span(p, 0.6, 0.9)), rot: Math.PI + 0.12 * stagger, size: 0.6, look: 'whole' }, breath: 0 }
    }
    case 'blanket': {
      // It is under the blanket: the lump trembles, and it pops out at the side and looks back at it.
      const out = smooth(span(p, 0.42, 0.58)) * on
      return { mouse: { ...STILL, x: -40 * out, y: -14 * up(span(p, 0.42, 0.62)), rot: 0.14 * out, sy: 1 + 0.08 * up(span(p, 0.42, 0.62)) }, thing: { x: 2.4 * Math.sin(TAU * 10 * p) * (1 - span(p, 0, 0.45)), y: 4, rot: 0, size: 0.4, look: 'open' }, breath: 0 }
    }
    case 'brush': {
      // The brush lands bristles down on its head: every hair it has stands up, and it shakes itself flat again.
      const puffed = up(span(p, 0.03, 0.75)), shake = Math.sin(TAU * 6 * p) * span(p, 0.35, 0.5) * on
      return { mouse: { ...STILL, rot: 0.1 * shake, sx: 1 + 0.22 * puffed, sy: 1 + 0.07 * puffed, fuss: p > 0.5 }, thing: { x: 6 * shake, y: -108 - 8 * puffed, rot: 0.15 * shake, size: 0.5, look: 'whole' }, breath: 0 }
    }
    case 'basket': {
      // The basket is over it, upside down: it walks about under it, to one side and the other, and lifts it off.
      const walk = Math.sin(TAU * 1.5 * span(p, 0.1, TIDIED_FROM)) * on, steps = Math.abs(Math.sin(TAU * 4.5 * span(p, 0.1, TIDIED_FROM))) * on
      return { mouse: { ...STILL, x: 28 * walk, y: -4 * steps, sy: 1 - 0.1 * on }, thing: { x: 28 * walk, y: -46 - 5 * steps - 26 * up(span(p, 0.66, 0.95)), rot: Math.PI, size: 0.72, look: 'whole' }, breath: 0 }
    }
  }
}
