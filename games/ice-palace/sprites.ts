import { KING_BEARD, KING_BODY, KING_HEAD, SUN_RAYS, paintKingBeard, paintKingBody, paintKingHead, paintSunRays } from './figures'
import { BIRD, HARE, KID_BODY, KID_HEAD, LEG, MITTEN, PEEPER_BODY, PEEPER_HEAD, paintBird, paintHare, paintKidBody, paintKidHead, paintLeg, paintMitten, paintPeeperBody, paintPeeperHead } from './kids'
import { bake, type MakeLayer, type Print, type Sprite, type Tiles } from './print'

// Every figure's still parts, painted once for a size (by day, under the
// night's pull, and left out of it) and stamped once a frame. What moves inside a
// figure is drawn live over its stamps, by figures.ts and kids.ts.

type Box = { x: number; y: number; w: number; h: number }

/** Each sprite: its box, what paints it, and how much larger than its own measures it is drawn, so that it is painted that sharp. */
const PARTS = {
  kingBody: [KING_BODY, paintKingBody, 1],
  kingBeard: [KING_BEARD, paintKingBeard, 1],
  kingHead: [KING_HEAD, paintKingHead, 1],
  sunRays: [SUN_RAYS, paintSunRays, 1],
  kidBody: [KID_BODY, paintKidBody, 1.34],
  kidHead: [KID_HEAD, paintKidHead, 1.34],
  leg: [LEG, paintLeg, 1.34],
  peeperBody: [PEEPER_BODY, paintPeeperBody, 1.25],
  peeperHead: [PEEPER_HEAD, paintPeeperHead, 1.25],
  bird: [BIRD, paintBird, 1],
  hare: [HARE, paintHare, 1],
  mitten: [MITTEN, paintMitten, 1],
} as const satisfies Record<string, readonly [Box, (p: Print) => void, number]>

export type SpriteName = keyof typeof PARTS
export type Sprites = Record<SpriteName, Sprite>

/** How many layers a set of sprites is painted on: each by day, by night, and left out of the night's pull. */
export const SPRITE_LAYERS = Object.keys(PARTS).length * 3

/** Paints every sprite for a surface of `density` device pixels to a stage unit. Null where a canvas gives no context to paint on. */
export function makeSprites(make: MakeLayer, density: number, tiles: Tiles): Sprites | null {
  const made: Partial<Sprites> = {}
  for (const name of Object.keys(PARTS) as SpriteName[]) {
    const [box, paint, larger] = PARTS[name]
    const sprite = bake(make, density * larger, tiles, box, paint)
    if (!sprite) return null
    made[name] = sprite
  }
  return made as Sprites
}
