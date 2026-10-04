import type { Visit } from './order'
import { TRAITS, lookCode, lookOf, pairOf, type Factor, type Look, type Pairs, type Trait } from './plant'

// What the loupe shows, and where each numeral lies.
//
// The loupe is the help the child fetches. Over a plant grown from seed it
// shows two beads for each trait under the marks of its two parents, a pod
// and a pinch of dust; over a runner's copy the two its one parent carries,
// under a sprig of runner; over a packet plant the two it came with, under a
// small packet. Let go over the tray it leaves the plants there in groups of
// a kind. It shows a way of looking and never which plants to cross: nothing
// here reads a visitor's wish.
//
// The sheet gives numerals two places and no other, each beside the quantity
// it stands for: beside the plants of a wish that asks for more than one
// alike (`wishNumeral`), which the view draws through symbols.ts, and beside
// each group of a sorted brood (`groupsOf`), which is not drawn. No numeral
// stands alone and play never depends on reading one: the wish draws its
// plants that many times and the group is there to be seen.
//
// The second of the two is held. Whether the count beside a sorted group is
// a numeral on a quantity or a reading on the child's work is the owner's to
// say, and until he answers the default holds: that count is not drawn
// (`GROUP_NUMERAL_DRAWN`). The groups themselves are.

/** Whether the count beside a sorted group is drawn. Held at no until the owner answers; a brood is sorted into groups either way. */
export const GROUP_NUMERAL_DRAWN = false

/** One trait under the loupe: the bead from the plant the pod sat on, and the bead from the plant the dust came from. */
export type Beads = { trait: Trait; fromOnto: Factor; fromDust: Factor; hidden: boolean }

/**
 * The beads of a plant, trait by trait. `hidden` marks a pair in which one
 * bead does not show in the plant: in height, leaf and petals a mixed pair
 * shows as the factor that hides the other. In colour both beads show.
 */
export function beadsOf(pairs: Pairs): Beads[] {
  return TRAITS.map((trait) => {
    const [fromOnto, fromDust] = pairOf(pairs, trait)
    return { trait, fromOnto, fromDust, hidden: trait !== 'colour' && fromOnto !== fromDust }
  })
}

/** For a young plant under the loupe: whether each of its beads is one its parent carries. It always is; the view draws the line it came down. */
export function cameFrom(young: Pairs, onto: Pairs, dust: Pairs): { trait: Trait; onto: boolean; dust: boolean }[] {
  return TRAITS.map((trait) => {
    const [fromOnto, fromDust] = pairOf(young, trait)
    return { trait, onto: pairOf(onto, trait).includes(fromOnto), dust: pairOf(dust, trait).includes(fromDust) }
  })
}

/** A group of like young in a sorted brood: what they look like, which plants they are, and how many. */
export type Group = { look: Look; ids: number[]; numeral: number }

/**
 * A brood sorted into groups of plants that look alike, the largest group
 * first and then in a fixed order of looks, so the same brood always sorts
 * the same way. `numeral` is the count of the group, from one to the size of
 * the brood; `groupNumeral` says whether it is laid beside the group.
 */
export function groupsOf(brood: readonly { id: number; pairs: Pairs; dry: boolean }[]): Group[] {
  const groups = new Map<number, Group>()
  for (const plant of brood) {
    const look = lookOf(plant.pairs, plant.dry), code = lookCode(look)
    const group = groups.get(code) ?? { look, ids: [], numeral: 0 }
    group.ids.push(plant.id)
    group.numeral = group.ids.length
    groups.set(code, group)
  }
  return [...groups.entries()].sort(([codeA, a], [codeB, b]) => b.numeral - a.numeral || codeA - codeB).map(([, group]) => group)
}

/** The numeral laid beside one group of a sorted brood, or none while that count is held for the owner. */
export function groupNumeral(group: Group): number | null {
  return GROUP_NUMERAL_DRAWN ? group.numeral : null
}

/** The numeral laid beside the plants of a wish: how many alike it asks for, or none when it asks for one. */
export function wishNumeral(visit: Visit): 2 | 3 | null {
  return visit.count === 1 ? null : visit.count
}
