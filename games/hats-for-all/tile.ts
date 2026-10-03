import { HOLE_GAP } from './stage'

/** How wide the hat tile is for this many hats: a pure number the view cuts the tile to and a test measures against. */
export function tileWidth(hats: number): number {
  return Math.max(1, hats) * HOLE_GAP + 0.9
}
