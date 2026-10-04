import { STREAM, draws } from './chance'
import { TRAITS, pairOf, withPair, type Factor, type Pairs } from './plant'

// How young come from parents. Two ways, and no third:
//
// - A seed takes one factor of each pair from each of two parents, each with
//   an even chance and each trait by itself.
// - A runner carries one parent's pairs unchanged.
//
// Chance is never smoothed. A pod is six draws, not a tidy sample: a pod of
// two pinks can hold no white at all, and the next can hold three.

/** Seeds in one pod. The game's own choice. */
export const POD_SEEDS = 6

/** One seed. `onto` is the plant the pod sits on and `dust` the plant the pollen came from; they may be the same plant. */
export function seedOf(next: () => number, onto: Pairs, dust: Pairs): Pairs {
  let seed = 0
  for (const trait of TRAITS) {
    const fromOnto: Factor = pairOf(onto, trait)[next() < 0.5 ? 0 : 1]
    const fromDust: Factor = pairOf(dust, trait)[next() < 0.5 ? 0 : 1]
    seed = withPair(seed, trait, [fromOnto, fromDust])
  }
  return seed
}

/**
 * The seeds of the page's `podIndex`th pod. They are drawn when the pod sets,
 * so the brood is fixed before it flies and a pod put away unburst holds the
 * same six when it is found.
 */
export function seedsOfPod(seed: number, podIndex: number, onto: Pairs, dust: Pairs): Pairs[] {
  const next = draws(seed, STREAM.pod, podIndex)
  return Array.from({ length: POD_SEEDS }, () => seedOf(next, onto, dust))
}

/** A runner's young: the one parent again. */
export function runnerOf(parent: Pairs): Pairs {
  return parent
}

/**
 * Every plant two parents can give, each with its chance, by the model and
 * not by sampling. The tests hold the draws against it, and the idle ladder
 * never reads it: it would be the answer.
 */
export function chancesOf(onto: Pairs, dust: Pairs): Map<Pairs, number> {
  let chances = new Map<Pairs, number>([[0, 1]])
  for (const trait of TRAITS) {
    const grown = new Map<Pairs, number>()
    for (const [partial, chance] of chances) {
      for (const fromOnto of pairOf(onto, trait)) {
        for (const fromDust of pairOf(dust, trait)) {
          const young = withPair(partial, trait, [fromOnto, fromDust])
          grown.set(young, (grown.get(young) ?? 0) + chance / 4)
        }
      }
    }
    chances = grown
  }
  return chances
}
