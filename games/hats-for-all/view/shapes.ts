import * as THREE from 'three'
import type { CreatureKind, HatKind } from '../kinds'
import { BODY, HAT_HEIGHT, type Body } from '../sizes'
import { HOLE_GAP } from '../stage'
import { disc, roundedRect } from './foam'

// The outlines everything is cut from. A hat's outline is drawn with its base
// on y = 0 and is used twice: for the hat, and a little larger for the hole it
// leaves in its tile.

/** A hat's outline, grown by `grow` all round (for its hole). Plain on purpose: one simple outline, no detail. */
export function hatOutline(kind: HatKind, grow = 0): THREE.Shape {
  const g = grow, shape = new THREE.Shape()
  if (kind === 'cone') {
    shape.moveTo(-0.72 - g, 0.16)
    shape.quadraticCurveTo(-0.84 - g, -g, -0.6, -g)
    shape.lineTo(0.6, -g)
    shape.quadraticCurveTo(0.84 + g, -g, 0.72 + g, 0.16)
    shape.lineTo(0.16 + g, 1.4 + g)
    shape.quadraticCurveTo(0, 1.7 + g * 2, -0.16 - g, 1.4 + g)
    shape.closePath()
    return shape
  }
  if (kind === 'dome') {
    shape.moveTo(-0.88 - g, 0.12)
    shape.quadraticCurveTo(-0.88 - g, -g, -0.74, -g)
    shape.lineTo(0.74, -g)
    shape.quadraticCurveTo(0.88 + g, -g, 0.88 + g, 0.12)
    shape.absarc(0, 0.14, 0.88 + g, 0, Math.PI, false)
    shape.closePath()
    return shape
  }
  // The brim: a flat-topped crown on a wide band.
  shape.moveTo(-1.0 - g, 0.1)
  shape.quadraticCurveTo(-1.0 - g, -g, -0.88, -g)
  shape.lineTo(0.88, -g)
  shape.quadraticCurveTo(1.0 + g, -g, 1.0 + g, 0.1)
  shape.lineTo(1.0 + g, 0.22)
  shape.quadraticCurveTo(1.0 + g, 0.34 + g, 0.86, 0.34 + g)
  shape.lineTo(0.6 + g, 0.34 + g)
  shape.lineTo(0.56 + g, 1.14)
  shape.quadraticCurveTo(0.56 + g, 1.3 + g, 0.4, 1.3 + g)
  shape.lineTo(-0.4, 1.3 + g)
  shape.quadraticCurveTo(-0.56 - g, 1.3 + g, -0.56 - g, 1.14)
  shape.lineTo(-0.6 - g, 0.34 + g)
  shape.lineTo(-0.86, 0.34 + g)
  shape.quadraticCurveTo(-1.0 - g, 0.34 + g, -1.0 - g, 0.22)
  shape.closePath()
  return shape
}

/** How wide the hat tile is for this many hats. */
export function tileWidth(hats: number): number {
  return Math.max(1, hats) * HOLE_GAP + 0.9
}

/** Where a hat's base lies in its tile, measured towards the back wall from the tile's middle. A hat lies with its top away from the child. */
export function holeBase(kind: HatKind): number {
  return -HAT_HEIGHT[kind] / 2
}

/** What a creature is cut from: its body and its feet, with the sizes the motion shares. */
export type Cut = Body & { body: THREE.Shape; feet: THREE.Shape[] }

export function creatureCut(kind: CreatureKind): Cut {
  if (kind === 'bop') {
    return { body: disc(1.02, 0, 1.22), feet: [roundedRect(-0.78, 0, 0.6, 0.42, 0.18), roundedRect(0.18, 0, 0.6, 0.42, 0.18)], ...BODY[kind] }
  }
  if (kind === 'lanky') {
    const body = roundedRect(-0.62, 0.2, 1.24, 1.75, 0.5)
    const neck = new THREE.Shape()
    neck.moveTo(-0.24, 1.7)
    neck.lineTo(0.24, 1.7)
    neck.lineTo(0.22, 2.9)
    neck.absarc(0, 3.02, 0.56, -0.4, Math.PI + 0.4, false)
    neck.closePath()
    return { body, feet: [roundedRect(-0.6, 0, 0.5, 0.38, 0.16), roundedRect(0.1, 0, 0.5, 0.38, 0.16), neck], ...BODY[kind] }
  }
  if (kind === 'flop') {
    const body = new THREE.Shape()
    body.moveTo(-0.5, 0.2)
    body.bezierCurveTo(-1.3, 0.2, -1.25, 1.35, -0.74, 1.8)
    body.bezierCurveTo(-0.7, 2.5, 0.7, 2.5, 0.74, 1.8)
    body.bezierCurveTo(1.25, 1.35, 1.3, 0.2, 0.5, 0.2)
    body.closePath()
    return { body, feet: [roundedRect(-0.74, 0, 0.58, 0.4, 0.18), roundedRect(0.16, 0, 0.58, 0.4, 0.18)], ...BODY[kind] }
  }
  if (kind === 'wig') {
    return { body: roundedRect(-1.25, 0.16, 2.5, 1.56, 0.72), feet: [roundedRect(-0.92, 0, 0.62, 0.36, 0.16), roundedRect(0.3, 0, 0.62, 0.36, 0.16)], ...BODY[kind] }
  }
  // Pip: a small bean on big flat feet.
  const body = new THREE.Shape()
  body.absellipse(0, 0.92, 0.56, 0.66, 0, Math.PI * 2, false, 0)
  return { body, feet: [roundedRect(-0.92, 0, 0.84, 0.34, 0.16), roundedRect(0.08, 0, 0.84, 0.34, 0.16)], ...BODY[kind] }
}

/** Flop's ear: a long rounded strip that hangs from its top end. */
export function earOutline(): THREE.Shape {
  return roundedRect(-0.2, -1.45, 0.4, 1.6, 0.2)
}

/** The foam arch the creatures come and go through, standing on y = 0. */
export function archOutline(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-2.3, 0)
  shape.lineTo(-1.45, 0)
  shape.lineTo(-1.45, 2.5)
  shape.absarc(0, 2.5, 1.45, Math.PI, 0, true)
  shape.lineTo(1.45, 0)
  shape.lineTo(2.3, 0)
  shape.lineTo(2.3, 2.6)
  shape.absarc(0, 2.6, 2.3, 0, Math.PI, false)
  shape.closePath()
  return shape
}

/**
 * One edge of a jigsaw mat tile, from one corner to the next: three dovetail
 * teeth that point to alternate sides. Two tiles that meet share the same
 * points, so they lock without a gap.
 */
export function toothedEdge(ax: number, ay: number, bx: number, by: number, flip: boolean): THREE.Vector2[] {
  const length = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / length, uy = (by - ay) / length, nx = -uy, ny = ux
  const teeth = 3, run = length / teeth, deep = 0.34, under = 0.07
  const points: THREE.Vector2[] = []
  const put = (along: number, out: number) => points.push(new THREE.Vector2(ax + ux * along + nx * out, ay + uy * along + ny * out))
  for (let tooth = 0; tooth < teeth; tooth++) {
    const from = tooth * run, side = ((tooth % 2 === 0) !== flip ? 1 : -1) * deep
    put(from, 0)
    put(from + run * 0.28 + under, 0)
    put(from + run * 0.28 - under, side)
    put(from + run * 0.72 + under, side)
    put(from + run * 0.72 - under, 0)
  }
  return points
}

/** The outline of the mat tile in column `i`, row `j`, of tiles `size` across, with the mat's corner at the origin. */
export function matTileOutline(i: number, j: number, size: number): THREE.Shape {
  const x0 = i * size, y0 = j * size, x1 = x0 + size, y1 = y0 + size
  // Each line of the grid has its own teeth, the same for the tile on either side of it.
  const bottom = toothedEdge(x0, y0, x1, y0, (i + j) % 2 === 0)
  const right = toothedEdge(x1, y0, x1, y1, (i + j) % 2 === 0)
  const top = toothedEdge(x0, y1, x1, y1, (i + j + 1) % 2 === 0).reverse()
  const left = toothedEdge(x0, y0, x0, y1, (i + j + 1) % 2 === 0).reverse()
  // A reversed edge starts at the far corner's first tooth, so each corner is added by the edge that leaves it.
  return new THREE.Shape([...bottom, ...right, new THREE.Vector2(x1, y1), ...top.slice(0, -1), new THREE.Vector2(x0, y1), ...left.slice(0, -1)])
}
