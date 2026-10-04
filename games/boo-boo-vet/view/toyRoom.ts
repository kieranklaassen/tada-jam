// The room's geometry for the toy's model, from the layout and the figures.
// Pure: no DOM, no clock. Everything is in design units; `toRoom` takes a
// finger on the surface to them.

import { SPECIES, type Species } from '../cast'
import type { Body, Room, Vec } from '../toy'
import type { Garden } from '../toyScene'
import { FIGURES } from './figures'
import { THING, layout, type Layout } from './layout'
import { DOOR_BOUNDS } from './room'

/** How far a thing on the table lies from the middle of the table, and how far under the table one lies from its middle. */
const TABLE_SIDE = 142, FLOOR_SIDE = 68
/** How far apart the three in the garden sit. */
const GARDEN_STEP = 98

/**
 * Where each animal's two spots are on its drawing (figures-a.ts, figures-b.ts), from where it sits: the one it
 * loves a stroke on and the one that makes it squirm (cast.ts), as rounds laid over the drawn part itself.
 */
const SPOTS: Readonly<Record<Species, Body['spots']>> = {
  bear: { belly: [{ x: 0, y: -74, r: 72 }], feet: [{ x: -76, y: -17, r: 44 }, { x: 76, y: -17, r: 44 }] },
  rabbit: { ears: [{ x: 0, y: -172, r: 34 }, { x: -27, y: -186, r: 26 }, { x: 27, y: -186, r: 26 }], tail: [{ x: 49, y: -22, r: 30 }] },
  cat: { chin: [{ x: 0, y: -106, r: 30 }], tail: [{ x: -92, y: -22, r: 28 }, { x: -112, y: -58, r: 28 }, { x: -104, y: -100, r: 28 }, { x: -74, y: -116, r: 24 }] },
  dog: { ear: [{ x: -78, y: -136, r: 36 }, { x: 78, y: -136, r: 36 }], paws: [{ x: -52, y: -11, r: 30 }, { x: 52, y: -11, r: 30 }, { x: 0, y: -10, r: 34 }] },
  hedgehog: { nose: [{ x: 0, y: -62, r: 22 }], back: [{ x: 0, y: -126, r: 30 }, { x: -52, y: -104, r: 28 }, { x: 52, y: -104, r: 28 }, { x: -64, y: -62, r: 24 }, { x: 64, y: -62, r: 24 }] },
  duck: { head: [{ x: 0, y: -156, r: 36 }], feet: [{ x: -45, y: -12, r: 38 }, { x: 45, y: -12, r: 38 }] },
}

const bodies = Object.fromEntries(
  SPECIES.map((species) => {
    const { bounds, anchors } = FIGURES[species]
    const w = bounds.x1 - bounds.x0, h = -bounds.y0
    // Where a held-up paw joins the body: the figure's own place for it, or the animal's side a third of the way up.
    const side = (anchors as Partial<Body['anchors']>).side ?? { x: -w * 0.36, y: -h * 0.3 }
    return [species, { w, h, left: bounds.x0, right: bounds.x1, anchors: { ...anchors, side }, spots: SPOTS[species] } satisfies Body]
  }),
) as Record<Species, Body>

export type ToyRoom = { layout: Layout; room: Room; garden: Garden }

export function roomFor(width: number, height: number): ToyRoom {
  const plan = layout(width, height), p = plan.pieces
  // The floor's top edge is drawn a little above where things stand on it.
  const floorY = plan.floor.y + 22
  const room: Room = {
    cart: plan.things,
    spots: {
      'table-left': { x: p.table.x - TABLE_SIDE, y: p.table.y - THING.h / 2 + 8 },
      'table-right': { x: p.table.x + TABLE_SIDE, y: p.table.y - THING.h / 2 + 8 },
      'floor-left': { x: p.table.x - FLOOR_SIDE, y: floorY - 54 },
      'floor-right': { x: p.table.x + FLOOR_SIDE, y: floorY - 54 },
    },
    patient: p.patient,
    waiting: p.waiting,
    mouse: p.mouse,
    lamp: p.lamp,
    // The carrier stands on a shelf over the door, beside the one who waits and clear of the floor.
    carrier: { x: p.door.x + 6, y: p.door.y + DOOR_BOUNDS.y0 - 16 },
    // The hiding place: the floor under the table.
    hide: { x: p.table.x, y: floorY - 4 },
    thing: THING,
    bodies,
  }
  const gardenY = p.window.y + 78
  const garden: Garden = [{ x: p.window.x - GARDEN_STEP, y: gardenY }, { x: p.window.x, y: gardenY }, { x: p.window.x + GARDEN_STEP, y: gardenY }]
  return { layout: plan, room, garden }
}

/** A point on the surface, in logical pixels, as a point in the room. */
export function toRoom(plan: Layout, x: number, y: number): Vec {
  return { x: (x - plan.ox) / plan.scale, y: (y - plan.oy) / plan.scale }
}
