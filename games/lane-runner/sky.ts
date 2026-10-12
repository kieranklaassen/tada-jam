import { blank, fromRows, outlined, oval, type Plaque } from './beads'

// What hangs in the sky and what hovers over the board, as plaques of beads
// like everything else: the sun, the clouds and the ghost hand. None of them
// may look like a sign: the sun's rays are uneven in length and in angle, so
// it reads as a sun and never as a plus or a cross.

/**
 * How far ahead of the fox the nearest thing in the sky hangs, in pegs: further than anything on the board is
 * ever drawn, so that no tree and no obstacle comes through the sun or a cloud on its way towards the child.
 */
export const SKY_NEAREST = 700
/** How many beads wide each cloud is. */
export const CLOUD_WIDTHS: readonly number[] = [34, 26, 42]
const CLOUDS = CLOUD_WIDTHS.length

export type Hung = { x: number; y: number; z: number; scale: number }

// Where each hangs was chosen by eye from a stand nearer the fox; it is carried out to its depth along the line
// of sight, so it is the same size in the same place on the glass.
const EYE = { y: 90, back: 128 }
const carried = (x: number, y: number, ahead: number, scale: number, out: number): Hung => {
  const k = (out + EYE.back) / (ahead + EYE.back)
  return { x: x * k, y: EYE.y + (y - EYE.y) * k, z: -out, scale: scale * k }
}

/** Where the sun hangs: behind every cloud. */
export function sunAt(): Hung {
  return carried(-236, 76, 470, 2.4, SKY_NEAREST + CLOUDS * 30)
}

/** Where cloud `i` is at `t` seconds: each drifts at its own pace, in a plane of its own. */
export function cloudAt(i: number, t: number): Hung {
  const x = ((i * 250 + t * (2.2 + i * 0.7) + 400) % 800) - 400
  return carried(x, 96 + (i % 2) * 16, 420 + i * 30, 2.6, SKY_NEAREST + i * 30)
}

/** The ghost hand: a pale mitten with one finger out, made of beads like everything else. */
export function handPlaque(): Plaque {
  return outlined(fromRows([
    '...WW....',
    '...WW....',
    '...WW....',
    '...WW....',
    '...WWWW..',
    '.W.WWWWWW',
    'WW.WWWWWW',
    'WWWWWWWWW',
    'WWWWWWWWW',
    '.WWWWWWWW',
    '..WWWWWW.',
    '..WWWWWW.',
  ]), 'A')
}

export function cloudPlaque(wide: number): Plaque {
  const cloud = blank(wide, 11)
  oval(cloud, wide * 0.5, 7, wide * 0.48, 3.6, 'a')
  oval(cloud, wide * 0.5, 6, wide * 0.46, 3.4, 'W')
  oval(cloud, wide * 0.32, 4.5, wide * 0.2, 3.6, 'W')
  oval(cloud, wide * 0.62, 3.6, wide * 0.22, 3.6, 'W')
  return cloud
}

/** The sun's rays: the angle of each, in radians, and how many beads long it is. Seven, at uneven angles and of uneven lengths, no two of them opposite each other. */
export const SUN_RAYS: readonly (readonly [number, number])[] = [[0.2, 5], [1.05, 3], [1.75, 6], [2.8, 4], [3.75, 6], [4.45, 3], [5.3, 4]]

/** The sun: a round of yellow with rays of uneven lengths at uneven angles, so that it reads as a sun and never as a sign. */
export function sunPlaque(): Plaque {
  const sun = blank(33, 33)
  for (const [angle, long] of SUN_RAYS) for (let r = 10; r < 10 + long; r++) oval(sun, 16 + Math.cos(angle) * r, 16 + Math.sin(angle) * r, 0.8, 0.8, 'y')
  oval(sun, 16, 16, 8.4, 8.4, 'Y')
  oval(sun, 14, 14, 3, 3, 'y')
  return sun
}

