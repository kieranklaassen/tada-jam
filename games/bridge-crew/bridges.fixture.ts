import type { Part } from './kit'

// Bridges for the tests: for each position, one bridge within the sheet's kit
// (first variant) that carries its job vehicle. They show that every sheet can
// be crossed; they are not shown to a child and are no part of the game.

export const part = (kind: Part['kind'], ax: number, ay: number, bx: number, by: number, turned = false): Part => ({ kind, a: [ax, ay], b: [bx, by], turned })
const edge = (ax: number, ay: number, bx: number, by: number) => part('plank', ax, ay, bx, by, true)

export const CROSSINGS: Readonly<Record<string, readonly Part[]>> = {
  'plank-gap': [edge(10, 6, 14, 6)],
  'rock-prop': [edge(8, 6, 12, 6), edge(12, 6, 15, 6), part('stick', 12, 3, 12, 6)],
  'first-triangle': [edge(9, 6, 12, 6), edge(12, 6, 15, 6), part('stick', 12, 6, 12, 4), part('stick', 9, 6, 12, 4), part('stick', 15, 6, 12, 4)],
  'jelly-run': [edge(8, 6, 11, 6), edge(11, 6, 15, 6), part('stick', 8, 4, 10, 6), part('stick', 15, 4, 13, 6)],
  'truss-span': [
    edge(7, 6, 10, 6), edge(10, 6, 14, 6), edge(14, 6, 17, 6), part('stick', 10, 6, 10, 4), part('stick', 14, 6, 14, 4),
    part('stick', 7, 6, 10, 4), part('stick', 17, 6, 14, 4), part('stick', 10, 4, 14, 4), part('stick', 10, 4, 12, 6), part('stick', 14, 4, 12, 6),
  ],
  'tube-post': [edge(7, 8, 10, 8), edge(10, 8, 14, 8), edge(14, 8, 17, 8), part('stick', 7, 6, 9, 8), part('stick', 17, 6, 15, 8), part('tube', 12, 3, 12, 8)],
  'piano-day': [edge(8, 6, 12, 6), edge(12, 6, 16, 6), part('stick', 12, 3, 12, 6)],
  'high-thread': [edge(8, 6, 12, 6), edge(12, 6, 16, 6), part('thread', 7, 10, 12, 6), part('thread', 17, 10, 12, 6)],
  'tall-bus': [edge(8, 6, 11, 6), edge(11, 6, 13, 6), edge(13, 6, 16, 6), part('stick', 8, 4, 10, 6), part('stick', 16, 4, 14, 6)],
  'mast-and-stay': [
    edge(7, 6, 11, 6), edge(11, 6, 14, 6), edge(14, 6, 17, 6), part('tube', 7, 6, 7, 10), part('tube', 17, 6, 17, 10),
    part('thread', 7, 10, 11, 6), part('thread', 7, 10, 3, 6), part('thread', 17, 10, 14, 6), part('thread', 17, 10, 21, 6),
  ],
  'arch-gorge': [
    edge(7, 8, 10, 8), edge(10, 8, 14, 8), edge(14, 8, 17, 8), part('stick', 8, 6, 10, 8), part('stick', 16, 6, 14, 8),
    part('stick', 9, 4, 11, 6), part('stick', 11, 6, 13, 6), part('stick', 13, 6, 15, 4), part('stick', 11, 6, 11, 8), part('stick', 13, 6, 13, 8),
  ],
  'barge-below': [edge(7, 6, 10, 6), edge(10, 6, 14, 6), edge(14, 6, 17, 6), part('stick', 10, 3, 10, 6), part('stick', 17, 4, 15, 6)],
  'thin-kit': [edge(8, 6, 12, 6), edge(12, 6, 16, 6), part('stick', 12, 6, 12, 4), part('thread', 8, 6, 12, 4), part('thread', 16, 6, 12, 4)],
  'long-haul': [edge(5, 6, 8, 6), edge(8, 6, 12, 6), edge(12, 6, 16, 6), edge(16, 6, 19, 6), part('thread', 4, 11, 8, 6), part('tube', 14, 2, 12, 6), part('tube', 14, 2, 16, 6)],
  'open-yard': [edge(6, 6, 10, 6), edge(10, 6, 14, 6), edge(14, 6, 18, 6), part('stick', 10, 3, 10, 6), part('thread', 19, 11, 14, 6)],
}
