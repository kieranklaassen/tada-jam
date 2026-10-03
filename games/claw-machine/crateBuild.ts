import { MINI } from './belly'
import { PLATE, buildMesh, mergeMeshes, type Brick, type BrickMesh } from './bricks'
import { toyBricks } from './builds'
import { EYE, eyeCentres, gobblerParts } from './gobblerBuild'
import { shapeOf, type GobblerId } from './gobblers'
import { RIDER, RISER, deckSpots, deckTop, riderSpots } from './layout'
import { CRATE as CRATE_COLOUR, CRATE_DARK } from './palette'
import { CRATE } from './places'
import type { Toy } from './toys'

// A crate as one mesh: its box, the load standing small on its deck, and its
// crews riding in rows behind, each row a step higher. It never comes apart
// while it waits, so it is one draw. Built about the middle of its foot, with
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
  // A lip along the front of the deck, and a riser for each row of riders.
  out.push({ x: -half, y: deck, z: depth - 0.5, w: CRATE.width, d: 0.5, h: 1, colour: CRATE_DARK, studs: false })
  for (let row = 0; row < rows; row++) out.push({ x: -half, y: deck, z: -depth - row * 0.5, w: CRATE.width, d: 2.2, h: Math.round((0.4 + row * RISER) / PLATE), colour: row % 2 === 0 ? CRATE_DARK : CRATE_COLOUR, studs: false })
  return out
}

export function crateMesh(which: number, toys: readonly Toy[], crews: readonly (readonly GobblerId[])[]): BrickMesh {
  const top = deckTop(which)
  const parts: { mesh: BrickMesh; scale?: number; at?: readonly [number, number, number] }[] = [{ mesh: buildMesh(box(which, crews.length)) }]
  deckSpots(toys).forEach((spot, i) => parts.push({ mesh: buildMesh(toyBricks(toys[i]), true), scale: MINI, at: [spot.x, top + spot.y, spot.z] }))
  riderSpots(crews).forEach((row, r) => row.forEach((spot, i) => {
    const shape = shapeOf(crews[r][i]), built = gobblerParts(shape), eye = eyeCentres(shape)[0], reach = EYE / 2 - 0.12
    const at = [spot.x, top + spot.y, spot.z] as const
    parts.push({ mesh: buildMesh(built.body, true), scale: RIDER, at })
    // Its pupils, looking at the child.
    parts.push({ mesh: buildMesh(built.pupils, true), scale: RIDER, at: [at[0], at[1] + (eye.y + Math.sin(AHEAD) * reach) * RIDER, at[2] + (eye.z + Math.cos(AHEAD) * reach) * RIDER] })
  }))
  return mergeMeshes(parts)
}
