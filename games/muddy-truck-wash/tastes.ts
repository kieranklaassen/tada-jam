import type { VehicleDef, VehicleId, Zone } from './roster'
import { patchCentre } from './silhouette'
import { CELLS, GRID_W, type Hand, type Surface } from './surface'

// What each vehicle likes and cannot stand. Fixed: one like and one dislike
// each, belonging to one tool on one part of its body, and working every
// time, so a child can learn them and set them off on purpose (pack:
// game-design, characters-with-opinions.md). A reaction is to the touch,
// never to the child.

export type Where = 'anywhere' | keyof VehicleDef['zones']

export type Taste = {
  /** The reaction's name: what the game plays for it. */
  id: 'foam-toot' | 'sneeze' | 'ladder-whoop' | 'soap-eyes' | 'polish-purr' | 'pipe-cough' | 'drum-turn' | 'tickle'
  feeling: 'like' | 'dislike'
  /** The tool that sets it off; `any` is every tool and the bare finger. */
  hand: Hand | 'any'
  where: Where
}

export const TASTES: Readonly<Record<VehicleId, readonly [Taste, Taste]>> = {
  // Tipper likes foam anywhere on it, and cannot stand the cloth on its nose.
  tipper: [
    { id: 'foam-toot', feeling: 'like', hand: 'sponge', where: 'anywhere' },
    { id: 'sneeze', feeling: 'dislike', hand: 'cloth', where: 'nose' },
  ],
  // The fire engine likes the hose anywhere on it, and cannot stand the sponge on its eyes.
  'fire-engine': [
    { id: 'ladder-whoop', feeling: 'like', hand: 'hose', where: 'anywhere' },
    { id: 'soap-eyes', feeling: 'dislike', hand: 'sponge', where: 'eyes' },
  ],
  // The tractor likes the cloth on its bonnet, and cannot stand the hose on its exhaust pipe.
  tractor: [
    { id: 'polish-purr', feeling: 'like', hand: 'cloth', where: 'nose' },
    { id: 'pipe-cough', feeling: 'dislike', hand: 'hose', where: 'part' },
  ],
  // The mixer likes anything on its drum, and cannot stand the sponge on its wheels.
  mixer: [
    { id: 'drum-turn', feeling: 'like', hand: 'any', where: 'part' },
    { id: 'tickle', feeling: 'dislike', hand: 'sponge', where: 'wheels' },
  ],
}

/**
 * Where each vehicle's eyes go when it glances at what it likes: sideways
 * toward the child and up, as the eyes take them. The tools hang on the rack
 * ahead of it (the cloth high, the hose in the middle, the sponge low); the
 * mixer looks back at its own drum.
 */
export const WANTS: Readonly<Record<VehicleId, { side: number; up: number }>> = {
  tipper: { side: 0.55, up: -0.2 },
  'fire-engine': { side: 0.55, up: 0.3 },
  tractor: { side: 0.55, up: 0.65 },
  mixer: { side: 1.45, up: 0.3 },
}

const inside = (zone: Zone, x: number, y: number): boolean => x >= zone.x0 && x <= zone.x1 && y >= zone.y0 && y <= zone.y1

/**
 * The taste a touch sets off, or null. A place-bound taste wins over one
 * that holds anywhere, so the sponge on the fire engine's eyes is the soap in
 * its eyes and not just foam.
 */
export function tasteFor(def: VehicleDef, hand: Hand, x: number, y: number): Taste | null {
  let found: Taste | null = null
  for (const taste of TASTES[def.id]) {
    if (taste.hand !== 'any' && taste.hand !== hand) continue
    if (taste.where === 'anywhere') found ??= taste
    else if (inside(def.zones[taste.where], x, y)) return taste
  }
  return found
}

/** The patches whose middle lies in a zone of the vehicle. */
export function cellsIn(def: VehicleDef, zone: Zone): number[] {
  const cells: number[] = []
  for (let cell = 0; cell < CELLS; cell++) {
    const { x, y } = patchCentre(def, cell % GRID_W, Math.floor(cell / GRID_W))
    if (inside(zone, x, y)) cells.push(cell)
  }
  return cells
}

/** Dried mud jams the mixer's drum: it only creaks until that mud is wet. */
export function drumJammed(def: VehicleDef, surface: Surface): boolean {
  return cellsIn(def, def.zones.part).some((cell) => surface[cell] === 'c')
}

/**
 * Tipper's sneeze throws its bed up and launches whatever foam is on it.
 * Returns the surface with the bed's foam gone (the paint under it is wet),
 * and how many patches of foam flew.
 */
export function launchFoam(def: VehicleDef, surface: Surface): { surface: Surface; flew: number } {
  const bed = cellsIn(def, def.zones.part).filter((cell) => surface[cell] === 'b' || surface[cell] === 'f')
  if (!bed.length) return { surface, flew: 0 }
  const next = surface.slice()
  for (const cell of bed) next[cell] = 'w'
  return { surface: next, flew: bed.length }
}

/** Foam that lands on the vehicle that waits: a hat of white foam on its topmost patches, from its nose back, one for each two that flew (at most four). None lands on a patch in `keep`. */
export function foamHat(surface: Surface, flew: number, keep: readonly number[] = []): Surface {
  const next = surface.slice()
  let left = Math.min(4, Math.ceil(flew / 2))
  for (let col = 0; col < GRID_W && left > 0; col++) {
    for (let row = Math.floor(CELLS / GRID_W) - 1; row >= 0; row--) {
      const cell = row * GRID_W + col
      if (next[cell] === '.') continue
      if (next[cell] !== 'f' && !keep.includes(cell)) { next[cell] = 'f'; left -= 1 }
      break
    }
  }
  return next
}
