import { WIDE } from './figures'
import { type Form, placeOf } from './places'
import { askerSize, bringerSize, edgeSize, hillSize, littleSize, rowSize } from './sizes'
import { ASKER, BASKET, EDGE_PEEK, EGG, FLOOR, HILL_SPOTS, clutchSpot, edgeSpot, eggSpots, inside, type Rect } from './stage'
import type { Kind } from './voices'
import { type Action, type Resident, type World, waitingOf } from './world'

// The page as a saved world is found: who and what stands where, with nothing
// in motion. It is plain data, read from the world and the shape of the
// surface, and it is the one place that turns the model into positions. The
// view draws it, a finger is looked up in it, a scene (plays.ts) starts and
// ends in it, and the overlap tests are held against it.

/** Feet and height: where something stands and how tall. */
export type Spot = { x: number; y: number; size: number }

export type Thing =
  /** At the stone: a grown one who asks, a little one who asks (in `alike`), or the egg that asks (in `who`). */
  | ({ key: 'asker'; what: 'grown' | 'little' | 'egg'; kind: Kind } & Spot)
  /** A spot of the row: an egg or a leaf pile with someone inside, or in `who` a grown one. */
  | ({ key: `slot:${number}`; slot: number; what: 'egg' | 'pile' | 'grown'; kind: Kind; heard: boolean } & Spot)
  /** A place on the hill. */
  | ({ key: `hill:${number}`; place: number; what: Resident['as']; kind: Kind } & Spot)
  /** The basket with its one egg. It is there only while an egg is in it. */
  | ({ key: 'basket'; kind: Kind } & Spot)
  /** Who or what waits at the edge: the next one to ask, or the next clutch in its nest with whoever brings it. */
  | ({ key: 'edge'; what: 'grown' | 'egg' | 'clutch'; kind: Kind | null; form: Form; eggs: number; around: Kind[]; /** A grown one who brings a clutch has room to stand well into the page: no basket beside it, nobody on the hill above. */ roomy: boolean } & Spot)

export type Picture = { things: Thing[]; view: Rect; row: number; leaves: boolean; form: Form | null; /** The calling stone is on the page once a clutch has come in: before that it would mean nothing. */ stone: boolean }

/** How big the egg that asks from the stone is, against a hide. */
export const ASKING_EGG = 1.18

export const feetOf = (rect: Rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h })

/** Where a spot of a row of `row` stands. */
export function slotSpot(slot: number, row: number): { x: number; y: number } {
  const spots = eggSpots(row)
  return feetOf(spots[Math.min(slot, spots.length - 1)])
}

/** Where the one who asks stands. */
export const STONE_FEET = feetOf(ASKER)

export function pictureOf(world: World, view: Rect): Picture {
  const things: Thing[] = [], cycle = world.cycle, playing = cycle !== null && !world.finished
  const row = playing ? cycle.kinds.length : 0, leaves = playing && placeOf(cycle.place).leaves
  for (const resident of world.hill) {
    const feet = feetOf(HILL_SPOTS[resident.place])
    things.push({ key: `hill:${resident.place}`, place: resident.place, what: resident.as, kind: resident.kind, ...feet, size: resident.as === 'family' ? hillSize(resident.kind) : littleSize(resident.kind) })
  }
  if (playing) {
    cycle.kinds.forEach((kind, slot) => {
      if (cycle.slots[slot] === 'done') return
      const what = cycle.form === 'who' ? 'grown' : leaves ? 'pile' : 'egg'
      things.push({ key: `slot:${slot}`, slot, what, kind, heard: cycle.slots[slot] === 'heard', ...slotSpot(slot, row), size: what === 'grown' ? rowSize(kind, row) : EGG.h })
    })
    if (cycle.asker !== null) {
      const what = cycle.form === 'who' ? 'egg' : cycle.form === 'alike' ? 'little' : 'grown'
      things.push({ key: 'asker', what, kind: cycle.asker, ...STONE_FEET, size: what === 'egg' ? EGG.h * ASKING_EGG : what === 'little' ? littleSize(cycle.asker) : askerSize(cycle.asker) })
    }
  }
  if (world.extra !== null) things.push({ key: 'basket', kind: world.extra, ...feetOf(BASKET), size: EGG.h })
  const waiting = waitingOf(world), right = view.x + view.w
  if (waiting) {
    const clutch = world.finished ? world.next! : null
    if (clutch) {
      // Between cycles: the next clutch in its nest, with the grown one who will ask first, or in `who` the grown ones of the row around it.
      // On the first frame of a first visit, and whenever the right of the hill is empty and no basket stands
      // there, the grown one who brings a clutch waits well into the page and bigger.
      const roomy = clutch.form === 'seek' && waiting.kind !== null && world.extra === null && !world.hill.some((resident) => resident.place >= 2)
      const spot = clutchSpot(view, roomy)
      things.push({ key: 'edge', what: 'clutch', kind: waiting.kind, form: clutch.form, eggs: clutch.form === 'who' ? 1 : clutch.kinds.length, around: clutch.form === 'who' ? [...clutch.kinds] : [], roomy, x: spot.x + spot.w / 2, y: FLOOR, size: waiting.kind && clutch.form === 'seek' ? (roomy ? bringerSize(waiting.kind) : edgeSize(waiting.kind)) : EGG.h })
    } else {
      things.push({ key: 'edge', what: waiting.what === 'egg' ? 'egg' : 'grown', kind: waiting.kind, form: waiting.form, eggs: waiting.what === 'egg' ? 1 : 0, around: [], roomy: false, x: right - (waiting.what === 'egg' ? 56 : EDGE_PEEK), y: FLOOR, size: waiting.what === 'egg' ? EGG.h : edgeSize(waiting.kind!) })
    }
  }
  return { things, view, row, leaves, form: playing ? cycle.form : null, stone: cycle !== null }
}

/** Where the grown one who brings a clutch stands while it waits: at the edge, or where there is room well into the page and bigger. */
export function bringerSpot(view: Rect, kind: Kind, roomy: boolean): Spot {
  const right = view.x + view.w, spot = clutchSpot(view, true)
  return roomy ? { x: spot.x + spot.w / 2, y: FLOOR - 6, size: bringerSize(kind) } : { x: right - EDGE_PEEK - 22, y: FLOOR - 6, size: edgeSize(kind) }
}

/**
 * Where the nest of a clutch that waits at the edge is, and how big against the basket. A grown one who brings
 * a clutch carries the nest on its head, so that both can be seen and nobody takes the nest for the basket
 * that stands beside it; with nobody to carry it, the nest stands on the ground.
 */
export function nestOf(view: Rect, form: Form, bringer: Kind | null, roomy = false): Spot {
  const spot = clutchSpot(view)
  if (form === 'seek' && bringer) { const stands = bringerSpot(view, bringer, roomy); return { x: stands.x, y: stands.y - stands.size * 0.9, size: roomy ? 0.72 : 0.6 } }
  return { x: spot.x + spot.w / 2, y: FLOOR + 8, size: form === 'alike' ? 0.84 : 0.74 }
}

/**
 * Whoever waits at the edge as a figure, each where it is drawn: the one who will ask next; or with a clutch the
 * grown one who brings it, or in `who` the grown ones of its row around the nest. An egg that waits is not one.
 */
export function waitersOf(thing: Extract<Thing, { key: 'edge' }>, view: Rect): { kind: Kind; x: number; y: number; size: number }[] {
  if (thing.what === 'grown') return thing.kind ? [{ kind: thing.kind, x: thing.x, y: thing.y, size: thing.size }] : []
  if (thing.what !== 'clutch') return []
  const bringer = thing.form === 'seek' && thing.kind ? [{ kind: thing.kind, ...bringerSpot(view, thing.kind, thing.roomy) }] : []
  // The grown ones of a `who` row stand side by side behind the nest, small and clear of each other, the last of
  // them at the very edge: where they overlapped, a beak of one could lie across an ear of the next.
  const right = view.x + view.w, last = thing.around.length - 1
  return [...bringer, ...thing.around.map((kind, i) => ({ kind, x: right - 14 - (last - i) * HUDDLE, y: thing.y - 96 - (i % 2) * 14, size: rowSize(kind, 4) * 0.5 }))]
}

/** How far apart the grown ones of a `who` clutch stand while they wait at the edge: a little more than the widest of them is wide there. */
export const HUDDLE = 66

/** The rectangle a finger has to land in for a thing, in the design. */
export function targetOf(thing: Thing, picture: Picture): Rect {
  if (thing.key === 'asker') return ASKER
  if (thing.key === 'basket') return BASKET
  if (thing.key === 'edge') return thing.what === 'clutch' ? clutchSpot(picture.view, thing.roomy) : edgeSpot(picture.view)
  if ('place' in thing) return HILL_SPOTS[thing.place]
  const hide = eggSpots(picture.row)[thing.slot]
  // A grown one in the row is taller than a hide: all of it is its target, its head and its eyes too.
  return thing.what === 'grown' && thing.size > hide.h ? { x: hide.x, y: hide.y + hide.h - thing.size, w: hide.w, h: thing.size } : hide
}

/** Whether a point is on one of those who wait at the edge, as they are drawn. */
function waiterAt(things: readonly Thing[], view: Rect, x: number, y: number): boolean {
  for (const thing of things) {
    if (thing.key !== 'edge') continue
    for (const one of waitersOf(thing, view)) {
      const half = (WIDE[one.kind] * one.size * 1.2) / 2
      if (x >= one.x - half && x <= one.x + half && y <= one.y && y >= one.y - one.size * 1.25) return true
    }
  }
  return false
}

/** Whether a point is on the basket as it is drawn: its bowl, or the egg that stands in it. */
function onBasket(things: readonly Thing[], x: number, y: number): boolean {
  const basket = things.find((thing) => thing.key === 'basket')
  if (!basket) return false
  const bowl = Math.abs(x - basket.x) <= 76 && y <= basket.y && y >= basket.y - 88
  const egg = Math.abs(x - basket.x) <= EGG.w / 2 && y <= basket.y - 30 && y >= basket.y - 34 - EGG.h
  return bowl || egg
}

/** What a finger at this point of the design lands on, as the tap the model takes; null where nothing is. */
export function whatIsAt(picture: Picture, world: World, x: number, y: number): Action | null {
  // The things a child would want first are looked for first where two targets meet.
  const order = ['edge', 'slot', 'asker', 'basket', 'hill']
  const things = [...picture.things].sort((a, b) => order.indexOf(a.key.split(':')[0]) - order.indexOf(b.key.split(':')[0]))
  // Whoever waits at the edge is its own target wherever it is seen: a finger on one of them is a tap on it, also
  // inside the basket's rectangle, unless it lands on the basket itself or its egg, which stand in front.
  if (waiterAt(things, picture.view, x, y) && !onBasket(things, x, y)) return { type: 'edge' }
  for (const thing of things) {
    if (!inside(targetOf(thing, picture), x, y, 10)) continue
    if (thing.key === 'edge') return { type: 'edge' }
    if (thing.key === 'asker') return { type: 'asker' }
    if (thing.key === 'basket') return { type: 'basket' }
    if ('slot' in thing) return { type: 'slot', slot: thing.slot }
    return { type: 'resident', resident: world.hill.findIndex((resident) => resident.place === thing.place) }
  }
  return null
}
