import type { VehicleDef, VehicleId, Zone } from './roster'
import { patchCentre } from './silhouette'
import { CELLS, GRID_W, type Hand, type Surface, type Tool } from './surface'

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
  // Tipper likes foam anywhere on it, whatever hand meets it or lays it, and cannot stand the cloth on its nose.
  tipper: [
    { id: 'foam-toot', feeling: 'like', hand: 'any', where: 'anywhere' },
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

/** The tool each vehicle keeps glancing at: the one its like belongs to, or foam's. The mixer wants something on its own drum and has none. */
export const LIKED: Readonly<Record<VehicleId, Tool | null>> = { tipper: 'sponge', 'fire-engine': 'hose', tractor: 'cloth', mixer: null }

/** Where the mixer's eyes go when it glances back at its own drum: sideways toward the child and up, as the eyes take them. */
export const AT_DRUM = { side: 1.45, up: 0.3 } as const

/**
 * Where a vehicle's eyes go to look at a point of the world from where it stands: sideways toward the child and up,
 * as the eyes take them, and no further round than eyes can turn. Written into `out`.
 */
export function glanceAt(def: VehicleDef, x: number, z: number, at: readonly [number, number, number], out: { side: number; up: number }): { side: number; up: number } {
  const eye = def.eyes[0]
  const dx = at[0] - (x + eye.at[0]), dy = at[1] - eye.at[1], dz = at[2] - z
  out.side = Math.max(-0.2, Math.min(1.5, Math.atan2(dz, -dx)))
  out.up = Math.max(-0.5, Math.min(0.8, Math.atan2(dy, Math.hypot(dx, dz))))
  return out
}

const inside = (zone: Zone, x: number, y: number): boolean => x >= zone.x0 && x <= zone.x1 && y >= zone.y0 && y <= zone.y1

/**
 * The taste a touch sets off, or null. A place-bound taste wins over one
 * that holds anywhere, so the sponge on the fire engine's eyes is the soap in
 * its eyes and not just foam.
 *
 * A touch is on a part when the point under the finger is in it, or when the
 * patch the touch was given to is: a finger a little way under a tyre is given
 * the tyre's patch, works on it, and is a touch on the wheels.
 */
export function tasteFor(def: VehicleDef, hand: Hand, x: number, y: number, patch?: { col: number; row: number }): Taste | null {
  const given = patch ? patchCentre(def, patch.col, patch.row) : null
  let found: Taste | null = null
  for (const taste of TASTES[def.id]) {
    if (taste.hand !== 'any' && taste.hand !== hand) continue
    if (taste.where === 'anywhere') found ??= taste
    else if (inside(def.zones[taste.where], x, y) || (given && inside(def.zones[taste.where], given.x, given.y))) return taste
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

/** What there is most of on a vehicle's moving part: `f` for either foam, `s` for soft mud or a smear, else the patch itself. */
export function partHolds(def: VehicleDef, surface: Surface): 'c' | 's' | 'f' | 'w' | 'd' | 'p' {
  const counts = { c: 0, s: 0, f: 0, w: 0, d: 0, p: 0 }
  for (const cell of cellsIn(def, def.zones.part)) {
    const patch = surface[cell]
    if (patch === '.') continue
    counts[patch === 'b' ? 'f' : patch === 'm' ? 's' : patch] += 1
  }
  let most: keyof typeof counts = 'd'
  for (const key of ['d', 'p', 'w', 'f', 's', 'c'] as const) if (counts[key] > counts[most] || (counts[key] > 0 && counts[key] === counts[most])) most = key
  return most
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

/**
 * Foam that lands on the vehicle that waits: a hat of white foam on its topmost patches, from its nose back, one for
 * each two that flew (at most four). It stays only where it lands on clean paint, wet, dull or shiny: off mud it
 * slides, and the mud is as it was, since foam thrown at mud has not soaped it. None lands on a patch in `keep`.
 */
export function foamHat(surface: Surface, flew: number, keep: readonly number[] = []): Surface {
  const next = surface.slice()
  let left = Math.min(4, Math.ceil(flew / 2))
  for (let col = 0; col < GRID_W && left > 0; col++) {
    for (let row = Math.floor(CELLS / GRID_W) - 1; row >= 0; row--) {
      const cell = row * GRID_W + col
      if (next[cell] === '.') continue
      if ((next[cell] === 'd' || next[cell] === 'w' || next[cell] === 'p') && !keep.includes(cell)) { next[cell] = 'f'; left -= 1 }
      break
    }
  }
  return next
}
