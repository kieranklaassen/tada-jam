// The paper things of the page: what is stuck to it or drawn in it and is
// neither a plant, a pot, a tool nor an animal. A pressed leaf and a pressed
// frond under tape, the one strip of tape that will not lie flat, the kept
// drawings on their cards, and the beetle's pencil sketches in the margin.
// Each looks like something a finger could touch, and each answers a touch in
// a small way of its own (game.ts): none of them is part of any move. Where
// each lies is here, for the view and for the finger alike. No DOM.

import { stubbornTape, type Point } from './hit'
import type { Layout } from './layout'

export type ThingId = 'leaf' | 'frond' | 'tape' | `kept${number}` | `sketch${number}`

/** Something pressed under one strip of tape: where its stalk goes under the tape, how it is turned there, and the measure it is drawn in. */
export type Pressed = { x: number; y: number; turn: number; u: number }

/** The pressed leaf, in the top left corner of the page. */
export function leafAt(layout: Layout): Pressed {
  const first = layout.shelf[0].cell, strip = layout.borderStrip, u = Math.min(first.x - strip.x, first.y) / 84
  return { x: strip.x + 22 * u, y: first.y - 12 * u, turn: -0.5, u }
}

/** The pressed frond: above the wish on a wide page, above the beetle on an upright one. It keeps clear of the top right corner, where the grown-up's gesture is taken. */
export function frondAt(layout: Layout): Pressed {
  const first = layout.shelf[0].cell, strip = layout.borderStrip, u = Math.min(first.x - strip.x, first.y) / 84
  const { wish, beetle, wide } = layout
  return { x: wide ? wish.x + wish.w * 0.3 : beetle.x + beetle.w * 0.2, y: wide ? first.y - 30 * u : beetle.y - 26 * u, turn: wide ? -0.16 : -0.4, u: u * 1.05 }
}

/** The box each pressed thing fills, in its own measure, about the point its stalk goes under the tape at. */
export const PRESSED = { leaf: { x: -16, y: -26, w: 98, h: 50 }, frond: { x: -14, y: -22, w: 112, h: 44 } } as const

/** Whether a point lies on a pressed thing: the point is turned and scaled into the thing's own measure. */
function onPressed(at: Pressed, box: { x: number; y: number; w: number; h: number }, point: Point): boolean {
  const dx = point.x - at.x, dy = point.y - at.y, cos = Math.cos(-at.turn), sin = Math.sin(-at.turn)
  const x = (dx * cos - dy * sin) / at.u, y = (dx * sin + dy * cos) / at.u
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
}

/**
 * The paper thing at a point, if one lies there. `kept` and `sketches` are how many kept drawings and margin
 * sketches the page shows now: an empty place for one is bare paper.
 */
export function thingAt(layout: Layout, point: Point, kept: number, sketches: number): ThingId | null {
  const inRect = (r: { x: number; y: number; w: number; h: number }) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h
  for (let i = 0; i < Math.min(kept, layout.kept.length); i++) if (inRect(layout.kept[i])) return `kept${i}`
  for (let i = 0; i < Math.min(sketches, layout.sketches.length); i++) if (inRect(layout.sketches[i])) return `sketch${i}`
  if (onPressed(leafAt(layout), PRESSED.leaf, point)) return 'leaf'
  if (onPressed(frondAt(layout), PRESSED.frond, point)) return 'frond'
  const end = stubbornTape(layout).end
  if (Math.hypot(point.x - end.x, point.y - end.y) <= Math.max(24, 20 * layout.k)) return 'tape'
  return null
}
