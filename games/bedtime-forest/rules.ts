import { ANIMALS, HOMES, type AnimalKey, type HomeKey } from './layout'

// What a home does with the animal carried into it. The right home takes
// its animal in. Every other pairing answers physically, with a reason a
// four-year-old can see: too big to fit, wet, too high, too draughty, or a
// creature who simply goes home by itself. Nothing here is a verdict.

export type Reaction =
  | 'settle' // the right home: curl up and sleep
  | 'bump' // too big for the entrance (or someone is already asleep inside): squash, pop back out
  | 'shiver' // a small animal in a big, draughty home: shivers and hops out
  | 'splash' // a land animal in the pond: splash, climb out, shake dry
  | 'slide' // a ground animal in the tree hollow: can't hold on, slides down the trunk
  | 'tip' // a ground animal in the nest: the nest tips and it tumbles off
  | 'flop' // the fish anywhere dry: flops out and wriggles back to the pond
  | 'flyHome' // a bird in the wrong home: hops out and flies to its own

export function reactionFor(animal: AnimalKey, home: HomeKey, occupied: boolean): Reaction {
  const spec = ANIMALS[animal]
  const target = HOMES[home]
  if (spec.home === home) return occupied ? 'bump' : 'settle'
  if (spec.kind === 'fish') return 'flop'
  if (spec.kind === 'bird') return 'flyHome'
  if (occupied) return 'bump'
  if (target.habitat === 'water') return 'splash'
  if (home === 'nest') return 'tip'
  if (target.habitat === 'tree') return spec.girth > target.entrance ? 'bump' : 'slide'
  return spec.girth > target.entrance ? 'bump' : 'shiver'
}

/** Does this reaction end with the animal asleep in its own home? */
export function endsAtHome(reaction: Reaction): boolean {
  return reaction === 'settle' || reaction === 'flop' || reaction === 'flyHome'
}
