// The arcade round's demos, organised by what they are for. These are demos,
// not games: each tests one idea, and none is a Tada cartridge. A group says
// what the group as a whole is trying to find out; each demo adds its own
// question. The arcade list and the jam's home screen both show this.
//
// Pure data: no DOM, no imports. registry.test.ts checks that every prototype
// folder appears here exactly once.

export interface CatalogDemo {
  key: string
  // The one thing this demo is trying to find out.
  question: string
  // Its visual treatment, where one was assigned on purpose.
  look?: string
}

export interface CatalogGroup {
  id: string
  title: string
  // What we are trying to test with this group, in a sentence or two.
  testing: string
  demos: readonly CatalogDemo[]
}

export const CATALOG: readonly CatalogGroup[] = [
  {
    id: 'calm-work',
    title: 'Real work, calmly',
    testing:
      'Montessori practical life and Waldorf rhythm: a real task with its real steps, the child sets the pace, and it ends when the work is done. No scores, rewards or praise. The question is whether that is fun enough to be chosen again.',
    demos: [
      { key: 'bread-day', question: 'Is kneading and shaping dough with a finger a pleasure by itself?' },
      { key: 'tea-time', question: 'Can a pour that follows the tilt, with spills you wipe up, carry a whole activity?' },
      { key: 'wash-day', question: 'Do rub, wring and peg feel like real cloth and water?' },
      { key: 'flower-table', question: 'Is cutting stems to length and arranging them satisfying with no right bouquet?' },
      { key: 'farm-morning', question: 'Does caring for animals in any order hold attention without a checklist?' },
      { key: 'goodnight-teddy', question: 'Can a demo end in sleep on purpose and still be wanted again?' },
      { key: 'dress-for-weather', question: 'Are zips and buttons fun when the weather, not a voice, shows the mistake?' },
      { key: 'advent-market', question: 'Does a place to wander with several real crafts work better than one activity?', look: 'cosy gouache' },
    ],
  },
  {
    id: 'playful-jobs',
    title: 'Jobs with jokes',
    testing:
      'The same making and caring, played for laughs: big reactions, silly customers, louder feedback. Set beside the calm group, these show how much of the fun is the task and how much is the comedy. Some keep small reward hooks (tips, unlocks).',
    demos: [
      { key: 'monster-pizza', question: 'Is making food for a character who reacts the strongest loop we have?' },
      { key: 'boo-boo-vet', question: 'Does sad-to-happy pay off when even the wrong tool is a joke?' },
      { key: 'muddy-truck-wash', question: 'Is rubbing mud off to reveal shiny paint enough, with no meter?' },
      { key: 'wild-hair-salon', question: 'Does hair that cuts, grows and blows about work as a toy with no wrong haircut?' },
      { key: 'fire-truck-hero', question: 'Is aiming one thick jet of water fun when everything it hits reacts?' },
      { key: 'feed-the-monster', question: 'Are distinct reactions to each food enough, or is this too crude?' },
    ],
  },
  {
    id: 'build-and-live',
    title: 'Build it, and someone moves in',
    testing:
      'Calm building in a fairy-tale world: the child makes something from simple pieces, then the world answers by using exactly what was built. Tests whether that answer can replace scores. Each demo also tries a different look.',
    demos: [
      { key: 'block-castle', question: 'Does your own block shape turning into a castle feel like magic?', look: '3D' },
      { key: 'sand-kingdom', question: 'Can the tide taking the castle back be an ending and not a loss?', look: '3D' },
      { key: 'tiny-island', question: 'Is placing toys on an island you can turn readable for small hands?', look: '3D low-poly' },
      { key: 'treetop-village', question: 'Do folk trying each ladder and bridge the moment it is built reward building?', look: 'cut paper' },
      { key: 'mushroom-village', question: 'Does a village that lives along the paths you drew invite more building?', look: 'kid drawing' },
      { key: 'fairy-house', question: 'Is seeing someone sleep on the bed you made enough of a payoff?' },
      { key: 'ice-palace', question: 'Can light through ice at dusk be the reward for building?', look: 'gritty print' },
      { key: 'bark-boats', question: 'Is tending a boat you built down a brook better than racing it?', look: 'watercolour' },
      { key: 'leaf-creatures', question: 'Does anything you assemble coming alive as itself make children build more?', look: 'wax crayon' },
      { key: 'box-fort', question: 'Is light spilling from the holes you cut the right payoff for a den?', look: 'cardboard' },
    ],
  },
  {
    id: 'open-play',
    title: 'Open play and making pictures',
    testing:
      'No goal at all: a beautiful material and room to imagine. Tests whether arranging, painting or wandering is enough when nothing is asked for and nothing is counted, and how each ends or tidies away.',
    demos: [
      { key: 'rainbow-world', question: 'Are wooden arches, peg dolls and silks enough to start a story?' },
      { key: 'wet-paint', question: 'Is colour that bleeds and mixes by itself the whole toy?' },
      { key: 'wool-picture', question: 'Does laying wool that then drifts and grazes feel like making something alive?', look: 'needle-felt' },
      { key: 'glow-pegs', question: 'Can a loud arcade look sit on a quiet peg-board toy?', look: 'neon arcade' },
      { key: 'chalk-town', question: 'Do toy cars following the lines you drew turn drawing into a town?', look: 'chalk on asphalt' },
      { key: 'nature-walk', question: 'Is noticing and gathering fun when nothing is counted?' },
      { key: 'lantern-walk', question: 'Does carrying a light you made through the dark hold a child?' },
    ],
  },
  {
    id: 'tap-toys',
    title: 'Tap-and-see toys for the youngest',
    testing:
      'Ages two to five: touch anything and something delightful happens. Tests how little structure a small child needs. Louder and faster than the calm groups, and one leans on rare surprises.',
    demos: [
      { key: 'princess-playground', question: 'A four-year-old designed it: is dropping a naughty princess and her cat onto playground toys as funny as she hoped?' },
      { key: 'balloon-pop-parade', question: 'Is popping, with something falling out of each balloon, enough on its own?' },
      { key: 'surprise-eggs', question: 'How much of the pull is the reveal, and how much is the rare ones?' },
      { key: 'choo-choo-draw', question: 'Is a train that follows any line you draw a toy without a goal?' },
      { key: 'whack-a-mole', question: 'Does a classic reaction game still land, or is it too frantic?' },
    ],
  },
  {
    id: 'one-verb',
    title: 'One-finger verbs from hit games',
    testing:
      'A single verb borrowed from a proven hit, to see whether the verb itself feels good in the hand. Most carry scores, combos or rounds, which is the part we would strip before any became a cartridge.',
    demos: [
      { key: 'fruit-slicer', question: 'Does the swipe-and-split feel right?' },
      { key: 'claw-machine', question: 'Is the suspense on the way up worth the wait?' },
      { key: 'hungry-hole', question: 'Is getting bigger by swallowing things a reward in itself?' },
      { key: 'snack-merge', question: 'Do chain merges feel earned or lucky?' },
      { key: 'draw-a-bridge', question: 'Does a scribble that becomes a solid object delight?' },
      { key: 'dig-for-the-duck', question: 'Is water finding its way down your tunnel satisfying?' },
      { key: 'slingshot-smash', question: 'Pull, fling, collapse: fun, or only destruction?' },
      { key: 'animal-tower', question: 'Is wobbly stacking funny or frustrating?' },
      { key: 'peg-blaster', question: 'Is a long bounce chain up a scale pleasing without aiming?' },
    ],
  },
  {
    id: 'arcade-loops',
    title: 'Arcade loops for older children',
    testing:
      'Loops from the biggest hits for ages six to twelve: coins, upgrades, rare finds, instant retry, rounds that speed up. These are the ones the owner called fun but addictive. Kept as a reference for what that pull feels like, not as a direction.',
    demos: [
      { key: 'campfire-nights', question: 'Does gather by day, hold the light by night work on one screen?' },
      { key: 'hop-across', question: 'Is a perfect hop with slapstick failure enough to keep going?' },
      { key: 'mutant-garden', question: 'How strong is plant, harvest, buy a stranger seed?' },
      { key: 'egg-heist', question: 'Is sneaking past a guard the fun, or the rare egg?' },
      { key: 'deep-sea-fishing', question: 'Does dodge down, gather up, sell, go deeper hook too hard?' },
      { key: 'gem-miner', question: 'Is digging for gems fun without the upgrade shop?' },
      { key: 'rocket-penguin', question: 'How much does launch, land, upgrade rely on numbers going up?' },
      { key: 'lane-runner', question: 'Is dodging at rising speed fun or just pressure?' },
      { key: 'blob-dash', question: 'Does instant retry make a hard course fair?' },
      { key: 'micro-mayhem', question: 'Are five-second surprises a format worth keeping?' },
      { key: 'brick-buster', question: 'How far can sound and motion alone lift an old game?' },
    ],
  },
]

export function groupOf(key: string): CatalogGroup | undefined {
  return CATALOG.find((group) => group.demos.some((demo) => demo.key === key))
}

export function demoOf(key: string): CatalogDemo | undefined {
  for (const group of CATALOG) {
    const demo = group.demos.find((d) => d.key === key)
    if (demo) return demo
  }
  return undefined
}
