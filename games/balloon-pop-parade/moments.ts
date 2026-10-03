import type { KindName } from './bodies'
import type { Bunch, Troop } from './world'

// Moments of a cycle as the rules lay them out, for looking at the toy with
// each kind of friend and each kind of sky: `look=` in the address picks one.
// Grown-ups only; a child never sees the address. Without it the toy opens on
// the first moment of a new game.

export type Moment = { troop: Troop; sky: Bunch[]; waiting: { kind: KindName; size: number } }

const one = (colour: KindName): Bunch => ({ colour, count: 1 })

export const MOMENTS: Record<string, Moment> = {
  // `pair-singles`: two ducks, one served, five single balloons in three colours.
  pair: { troop: { kind: 'duck', size: 2, held: [true, false] }, sky: [one('duck'), one('hippo'), one('crab'), one('duck'), one('hippo')], waiting: { kind: 'frog', size: 3 } },
  // `solo-two-colours`: one frog and four single balloons in two colours.
  solo: { troop: { kind: 'frog', size: 1, held: [false] }, sky: [one('crab'), one('frog'), one('frog'), one('crab')], waiting: { kind: 'hippo', size: 1 } },
  // `bunches-own-colour`: three hippos and bunches of two, one and three.
  bunches: { troop: { kind: 'hippo', size: 3, held: [false, false, false] }, sky: [{ colour: 'hippo', count: 2 }, one('hippo'), { colour: 'hippo', count: 3 }], waiting: { kind: 'crab', size: 2 } },
  // `bunches-mixed`: two crabs, one served, and four bunches in three colours.
  mixed: { troop: { kind: 'crab', size: 2, held: [true, false] }, sky: [{ colour: 'duck', count: 2 }, one('crab'), { colour: 'frog', count: 3 }, { colour: 'crab', count: 2 }], waiting: { kind: 'duck', size: 2 } },
}

export function momentFor(search: string): Moment | null {
  return MOMENTS[new URLSearchParams(search).get('look') ?? ''] ?? null
}
