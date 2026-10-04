// The error as a consequence (ART.md, "The error as a consequence"). There is
// no wrong bread, only a bread this customer does not want. This module holds
// what each customer does about it, by name, and where the mend lies: in place
// on the peel, back in the oven, or in a new dough. Both are found by running
// the rules, so they cannot say something the rules do not do.

import { CRUSTS, RISE_SECONDS, BAKE_SECONDS, darker, gather, kindOf, pull, push, rest, tip, type Bread, type Ingredient, type Load, type Stuff } from './stuff'
import { judge, type Animal, type Group, type Reason, type Verdict } from './tastes'

// --- What the customer does ---------------------------------------------------

/** When a customer reacts: to a thing it wants, to one of its secrets, to the bread it wants least, or to one of the reasons it hands a thing back. */
export type Occasion = 'wanted' | 'secret' | 'hated' | Reason

/**
 * Every customer's own reaction to every occasion it can meet, by name. No
 * name is used twice: no two characters share a reaction, and one character
 * never shows two reasons the same way. Each is about the thing handed over
 * and plays at it, never at the child.
 */
export const REACTIONS: Record<Animal, Partial<Record<Occasion, string>>> = {
  goat: { wanted: 'goat-cracks-it-on-horns', hated: 'goat-wears-loaf-on-horn', nothing: 'goat-chews-the-peel-edge', dust: 'goat-sneezes-beard-white', wet: 'goat-shakes-beard-dry', 'loose-seeds': 'goat-seed-in-beard', raw: 'goat-strings-from-horns', crumb: 'goat-loaf-falls-off-horn' },
  sparrows: { wanted: 'sparrows-crumb-feast', hated: 'sparrows-beaks-tink-and-bounce', nothing: 'sparrows-peck-bare-wood', dust: 'sparrows-dust-bath', wet: 'sparrows-flutter-wet', 'loose-seeds': 'sparrows-juggle-one-seed', raw: 'sparrows-stuck-by-beaks', crumb: 'sparrows-slide-off-crust' },
  dachshund: { wanted: 'dachshund-long-loaf-stuck-in-lane', hated: 'dachshund-chases-rolling-loaf', nothing: 'dachshund-sniffs-along-peel', dust: 'dachshund-sneezes-backwards', wet: 'dachshund-shakes-end-to-end', 'loose-seeds': 'dachshund-seed-on-nose', raw: 'dachshund-ears-stuck-in-dough', shape: 'dachshund-loaf-rocks-in-basket' },
  bear: { wanted: 'bear-hugs-loaf-rolls-back', hated: 'bear-tooth-clonks-and-rings', nothing: 'bear-looks-under-the-peel', dust: 'bear-sneeze-blows-cap-off', wet: 'bear-wrings-out-paw', 'loose-seeds': 'bear-hunts-seed-in-fur', raw: 'bear-paws-stuck-together', crumb: 'bear-loaf-through-paws' },
  crow: { wanted: 'crow-flies-off-feather-drifts', hated: 'crow-turns-its-back', nothing: 'crow-taps-peel-with-beak', dust: 'crow-goes-grey', wet: 'crow-ruffles-dry', 'loose-seeds': 'crow-drops-seed-from-height', raw: 'crow-strings-on-claw', crust: 'crow-holds-wing-against-loaf' },
  hen: { wanted: 'hen-chicks-carry-loaf-off', secret: 'hen-chicks-ride-the-peel', hated: 'hen-chicks-all-look-up', nothing: 'hen-scratches-the-peel', dust: 'hen-chicks-sneeze-in-a-row', wet: 'hen-lifts-chicks-out', 'loose-seeds': 'hen-chicks-peck-past-her-friend', raw: 'hen-chick-stuck-in-dough', seeds: 'hen-turns-the-loaf-over' },
  duck: { wanted: 'duck-wears-pancake-as-hat', secret: 'duck-paddles-on-the-peel', hated: 'duck-loaf-slides-off-bill', nothing: 'duck-slaps-peel-with-foot', dust: 'duck-sneezes-a-quack', wet: 'duck-splashes-its-friend', 'loose-seeds': 'duck-dabbles-seeds-away', raw: 'duck-bill-stuck-shut', crumb: 'duck-bread-rolls-off-foot' },
  mole: { wanted: 'mole-curls-up-on-loaf', hated: 'mole-sooty-nose-sneeze', nothing: 'mole-pats-about-for-it', dust: 'mole-digs-in-the-heap', wet: 'mole-wipes-its-glasses', 'loose-seeds': 'mole-pockets-one-seed', raw: 'mole-sinks-in-to-the-elbows', crumb: 'mole-prods-it-and-frowns', shape: 'mole-cannot-get-arms-round', crust: 'mole-blinks-at-the-dark-crust' },
}

/** The occasion a verdict is for the animal that reacts to it. */
export function occasionOf(verdict: Verdict): Occasion {
  return verdict.wanted ? (verdict.secret ? 'secret' : 'wanted') : verdict.hated ? 'hated' : verdict.reason
}

/** Who reacts to the verdict and with which reaction. A group that wants the thing reacts by its first animal, and the rest join in. */
export function reactionTo(group: Group, verdict: Verdict): { by: Animal; name: string } {
  const by = verdict.wanted ? group[0] : verdict.by
  const occasion = occasionOf(verdict)
  // Every occasion an animal can meet has a reaction of its own (a test holds this); the fall-back is never reached in play.
  return { by, name: REACTIONS[by][occasion] ?? REACTIONS[by].nothing! }
}

// --- Where the mend lies -------------------------------------------------------

/** What is out on the bench: the jar and the seed dish come out with the order. */
export type Tools = { jar: boolean; seeds: boolean }

const keyOf = (stuff: Stuff): string => `${stuff.flour}${stuff.water}${+stuff.bubbly}${+stuff.seeds}${+stuff.long}/${stuff.work}/${stuff.rise}`

/** Everything the child can do to raw stuff without clearing the peel, leaving time out: each returns what lies there after. */
function acts(stuff: Stuff, tools: Tools): Load[] {
  const ingredients: Ingredient[] = ['flour', 'water', ...(tools.jar ? (['bubbly'] as const) : []), ...(tools.seeds ? (['seeds'] as const) : [])]
  return [...ingredients.map((what) => tip(stuff, what).load), push(stuff).load, pull(stuff).load, gather(stuff).load, rest(stuff, 'nook', RISE_SECONDS * 2), rest(stuff, 'oven', BAKE_SECONDS)]
}

const found = new Map<string, Bread[]>()

/** Every bread that raw stuff can still become, by any acts on the peel, the nook and the oven. Remembered, since the answer never changes. */
export function canStillBecome(stuff: Stuff, tools: Tools): Bread[] {
  const asked = `${+tools.jar}${+tools.seeds}${keyOf(stuff)}`, known = found.get(asked)
  if (known) return known
  const breads = search(stuff, tools)
  found.set(asked, breads)
  return breads
}

function search(stuff: Stuff, tools: Tools): Bread[] {
  const seen = new Set<string>(), breads = new Map<string, Bread>(), queue: Stuff[] = [{ ...stuff, bake: 0 }]
  while (queue.length > 0) {
    const at = queue.pop()!, key = keyOf(at)
    if (seen.has(key)) continue
    seen.add(key)
    for (const after of acts(at, tools)) {
      if (!after) continue
      if (after.raw) queue.push(after)
      else for (let bread = after, bakes = 0; bakes < CRUSTS.length; bakes++, bread = darker(bread)) breads.set(JSON.stringify(bread), bread)
    }
  }
  return [...breads.values()]
}

/**
 * Where the mend lies for a thing the group does not want:
 * - `in-place`: it is raw, and something done to it on the peel still makes a bread they want
 * - `oven-again`: it is baked, and going back in the oven makes it one
 * - `anew`: it stays what it is, somebody else's favourite, and theirs is made from fresh flour and water
 */
export type Mend = 'wanted' | 'in-place' | 'oven-again' | 'anew'

export function mendFor(group: Group, load: Load, tools: Tools): Mend {
  const comes = (bread: Bread): boolean => { const verdict = judge(group, bread); return verdict.wanted && !verdict.secret }
  if (judge(group, load).wanted) return 'wanted'
  if (!load || (load.raw && kindOf(load) === 'nothing')) return 'anew'
  if (load.raw) return canStillBecome(load, tools).some(comes) ? 'in-place' : 'anew'
  return comes(darker(load)) || comes(darker(darker(load))) ? 'oven-again' : 'anew'
}
