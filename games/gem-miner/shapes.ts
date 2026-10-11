import type { Point } from './input'
import { BLOCKS, CAGE, CELL, COLS, HILL, TOOLS, corner, feetOf, isGrass, type Box, type Tool } from './layout'
import { PERCH, gemsIn, type DwellerKind, type Gem, type World } from './world'

// Where each thing that answers a touch is drawn, and how large. The view
// draws from these numbers and the game finds a finger with them, so a thing
// is touched where it is drawn in every state it can be in.

/** How tall the mole stands, candle and all, and how tall when he ducks under a hung lamp. */
export const MOLE_TALL = 84
export const MOLE_DUCKED = 46
export const MOLE_WIDE = 76

/** The mole as drawn, from the place of his feet. */
export function moleBox(x: number, y: number, ducked: boolean): Box {
  const tall = ducked ? MOLE_DUCKED : MOLE_TALL
  return { x: x - MOLE_WIDE / 2, y: y - tall, w: MOLE_WIDE, h: tall }
}

/** Half the width of a gem as drawn. */
export const GEM_R = 13

/**
 * The middle of a gem that is out of its block: low on the floor at the left of its block (a second and a third
 * that fell there beside it), half way up the wall it is set in, or under the roof on the rope.
 */
export function gemSpot(world: World, gem: Gem): Point {
  const at = corner(gem.at)
  if (gem.rest === 'left') return { x: at.x + 9, y: at.y + 44 }
  if (gem.rest === 'right') return { x: at.x + CELL - 9, y: at.y + 44 }
  if (gem.rest === 'hung') return { x: at.x + CELL / 2, y: at.y + 26 }
  const order = gemsIn(world, gem.at).filter((other) => other.rest === 'floor').indexOf(gem)
  return { x: at.x + 20 + Math.max(0, order) * 24, y: at.y + CELL - 4 - GEM_R }
}

/** What a finger has to land in to take a gem: the gem and a margin round it. */
export function gemBox(spot: Point): Box {
  return { x: spot.x - 24, y: spot.y - 26, w: 48, h: 50 }
}

/** Where a tool lies: the point under its middle, on the floor at the right of a block or on the grass. */
export function toolSpot(node: number): Point {
  const feet = feetOf(node)
  if (node === CAGE) return { x: feet.x, y: feet.y }
  if (isGrass(node)) return { x: feet.x, y: HILL.y - 2 }
  return { x: feet.x + 20, y: feet.y }
}

/**
 * Where a lying tool rests: on the floor of its block, or, in a block with dug space under it, sitting on the tool
 * that lies in the block below (a shaft with no free floor), its foot on that tool's top.
 */
export function toolRest(world: World, tool: Tool): Point {
  const node = world.tools[tool]
  const spot = toolSpot(node)
  if (isGrass(node) || node === CAGE || node + COLS >= BLOCKS || world.kinds[node + COLS] !== 'open') return spot
  const under = TOOLS.find((other) => other !== tool && world.mole.tool !== other && world.tools[other] === node + COLS && !(other === 'rope' && world.gems.some((gem) => gem.rest === 'hung')))
  if (!under) return spot
  return { x: spot.x, y: toolRest(world, under).y - TOOL_SIZE[under].h + 6 }
}

/** The size each tool is drawn at when it lies. */
export const TOOL_SIZE: Record<Tool, { w: number; h: number }> = { wedge: { w: 40, h: 44 }, bucket: { w: 44, h: 46 }, rope: { w: 46, h: 40 } }

/** A lying tool as a finger finds it: its picture and a margin, at least 52 by 52. `spot` is the point under its middle. */
export function toolBox(tool: Tool, spot: Point): Box {
  const w = Math.max(52, TOOL_SIZE[tool].w + 8), h = Math.max(52, TOOL_SIZE[tool].h + 8)
  return { x: spot.x - w / 2, y: spot.y - h, w, h }
}

/** A loose boulder as drawn, from the top left corner of where it is. */
export function boulderBox(at: Point): Box {
  return { x: at.x + 6, y: at.y + 10, w: CELL - 12, h: CELL - 14 }
}

/** A gem as drawn, from its middle. */
export function gemShape(at: Point): Box {
  return { x: at.x - GEM_R, y: at.y - GEM_R, w: GEM_R * 2, h: GEM_R * 2 }
}

/** The size each dweller is drawn at. */
export const DWELLER_SIZE: Record<DwellerKind, { w: number; h: number }> = {
  bat: { w: 46, h: 66 }, glowworm: { w: 40, h: 58 }, spider: { w: 56, h: 56 },
  newt: { w: 60, h: 26 }, lizard: { w: 62, h: 26 }, mushroom: { w: 46, h: 44 }, beetle: { w: 44, h: 30 }, fern: { w: 62, h: 52 }, snail: { w: 50, h: 36 }, flower: { w: 44, h: 62 },
  moth: { w: 44, h: 36 }, dragonfly: { w: 56, h: 34 },
}

/** The point a dweller is hung from, stands on or hovers round: the middle of the roof, of the floor, or of the block. */
export function dwellerSpot(kind: DwellerKind, at: number): Point {
  const top = corner(at)
  const perch = PERCH[kind]
  // A spider sits in the top corner of its block, at its web.
  if (kind === 'spider') return { x: top.x + 30, y: top.y + 2 }
  if (perch === 'roof') return { x: top.x + CELL / 2, y: top.y + 2 }
  if (perch === 'floor') return { x: top.x + CELL / 2, y: top.y + CELL - 4 }
  return { x: top.x + CELL / 2, y: top.y + 40 }
}

/** A dweller as drawn at rest, `shown` of its full size (1 when it is all there, 0 when it has drawn back out of the mole's way). */
export function dwellerBox(kind: DwellerKind, at: number, shown = 1): Box {
  const spot = dwellerSpot(kind, at), size = DWELLER_SIZE[kind]
  const w = size.w * shown, h = size.h * shown
  const perch = PERCH[kind]
  if (perch === 'roof') return { x: spot.x - w / 2, y: spot.y, w, h }
  if (perch === 'floor') return { x: spot.x - w / 2, y: spot.y - h, w, h }
  return { x: spot.x - w / 2, y: spot.y - h / 2, w, h }
}
