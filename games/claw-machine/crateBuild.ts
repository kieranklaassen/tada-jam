import { PLATE, buildMesh, mergeMeshes, type Brick, type BrickMesh } from './bricks'
import { toyBricks } from './builds'
import { EYE, eyeCentres, gobblerParts } from './gobblerBuild'
import { shapeOf, type GobblerId } from './gobblers'
import { ARCH, BED, HANDLE, ON_DECK, RIDER, RIDER_STEP, RIDER_Z, RISER, RISER_BASE, deckSpots, deckTop, handleSpot, riderSpots } from './layout'
import { STEEL } from './palette'
import { CRATE as CRATE_COLOUR, CRATE_DARK } from './palette'
import { CRATE } from './places'
import type { Toy } from './toys'

// A crate as one mesh: its box, its bed with the load standing small on it,
// and its crews riding in rows behind, each row a step higher. It never comes
// apart while it waits, so it is one draw; while it pours, its bed is a
// second one. Built about the middle of its foot, with
// y = 0 on the shelf it stands on.

/** The angle above level at which the child looks in: a rider looks back along it. */
const AHEAD = 0.6

function box(which: number, rows: number): Brick[] {
  const out: Brick[] = [], half = CRATE.width / 2, depth = CRATE.depth / 2, deck = Math.round(deckTop(which) / PLATE)
  // Courses of long bricks, with their joints stepped from course to course.
  for (let y = 0, course = 0; y < deck; y += 3, course++) {
    const h = Math.min(3, deck - y), joint = course % 2 === 0 ? 7 : 6
    const colour = course % 2 === 0 ? CRATE_COLOUR : CRATE_DARK
    out.push({ x: -half, y, z: -depth, w: joint, d: CRATE.depth, h, colour, studs: y + h >= deck })
    out.push({ x: -half + joint, y, z: -depth, w: CRATE.width - joint, d: CRATE.depth, h, colour, studs: y + h >= deck })
  }
  // The arch over the front of the load, and the knob on it.
  const handle = handleSpot(), arch = Math.round(ARCH / PLATE)
  for (const side of [-1, 1]) out.push({ x: side * (half - 0.25) - 0.25, y: deck, z: handle.z - 0.25, w: 0.5, d: 0.5, h: arch - 1, colour: STEEL, studs: false })
  out.push({ x: -half, y: deck + arch - 1, z: handle.z - 0.25, w: CRATE.width, d: 0.5, h: 1, colour: STEEL, studs: false })
  out.push({ x: handle.x - 0.8, y: deck + arch, z: handle.z - 0.8, w: 1.6, d: 1.6, h: Math.round(HANDLE / PLATE), colour: STEEL, round: true, studs: true })
  // A riser for each row of riders: each a step higher and a step further back, none standing in another.
  for (let row = 0; row < rows; row++) {
    const front = RIDER_Z + RIDER_STEP / 2 - row * RIDER_STEP
    out.push({ x: -half, y: deck, z: front - RIDER_STEP + 0.02, w: CRATE.width, d: RIDER_STEP - 0.04, h: Math.round((RISER_BASE + row * RISER) / PLATE), colour: row % 2 === 0 ? CRATE_DARK : CRATE_COLOUR, studs: false })
  }
  return out
}

/** The bed: one plain plate, lying on the studs of the front of the deck. Built in the crate's own measure. */
function bed(which: number): Brick[] {
  return [{ x: -BED.half, y: (deckTop(which) + BED.lift) / PLATE, z: BED.back, w: BED.half * 2, d: BED.front - BED.back, h: (BED.top - BED.lift) / PLATE, colour: CRATE_DARK, studs: false }]
}

/** The bed alone, for the stage to tip. */
export function bedMesh(which: number): BrickMesh {
  return buildMesh(bed(which), true)
}

/** A crate as one mesh. `withBed` is false while its bed is tipping: the stage then draws the bed by itself. */
export function crateMesh(which: number, toys: readonly Toy[], places: readonly number[], crews: readonly (readonly GobblerId[])[], withBed = true): BrickMesh {
  const top = deckTop(which)
  const parts: { mesh: BrickMesh; scale?: number; at?: readonly [number, number, number] }[] = [{ mesh: buildMesh(box(which, crews.length), true) }]
  if (withBed) parts.push({ mesh: bedMesh(which) })
  deckSpots(toys, places).forEach((spot, i) => parts.push({ mesh: buildMesh(toyBricks(toys[i]), true), scale: ON_DECK, at: [spot.x, top + spot.y, spot.z] }))
  riderSpots(crews).forEach((row, r) => row.forEach((spot, i) => {
    const shape = shapeOf(crews[r][i]), built = gobblerParts(shape), eye = eyeCentres(shape)[0], reach = EYE / 2 - 0.12
    const at = [spot.x, top + spot.y, spot.z] as const
    parts.push({ mesh: buildMesh(built.body, true), scale: RIDER, at })
    // Its pupils, looking at the child.
    parts.push({ mesh: buildMesh(built.pupils), scale: RIDER, at: [at[0], at[1] + (eye.y + Math.sin(AHEAD) * reach) * RIDER, at[2] + (eye.z + Math.cos(AHEAD) * reach) * RIDER] })
  }))
  return mergeMeshes(parts)
}
