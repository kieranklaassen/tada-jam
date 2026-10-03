// The object-by-action grid of the design sheet, as data: six things, five
// things to do with each, and for every cell what is seen and what is heard.
// Pure. A test holds that no two cells are the same, so the grid cannot
// quietly lose a result while the game is built on it.

export const THINGS = ['pim', 'mog', 'dot', 'bo', 'plank', 'sand'] as const
export type Thing = (typeof THINGS)[number]

/** For a friend: tapped, onto the low end, onto the high end, onto a friend's head, dropped in the sand. The plank and the sand read the same five columns as the sheet does. */
export const DEEDS = ['tap', 'low-end', 'high-end', 'on-a-friend', 'in-the-sand'] as const
export type Deed = (typeof DEEDS)[number]

export type Cell = {
  /** What is seen: a name for one distinct motion. */
  seen: string
  /** What is heard: a voice of voices.ts, with what sets it apart in this cell. */
  heard: string
}

export const CELLS: Readonly<Record<Thing, Readonly<Record<Deed, Cell>>>> = {
  pim: {
    tap: { seen: 'quick hop on or off, crown lagging', heard: 'chirp pim: a squeak up' },
    'low-end': { seen: 'end sinks a hair, she stamps', heard: 'thump weight 2 on plank, soft' },
    'high-end': { seen: 'tips it with a small toss, or dangles kicking', heard: 'thump weight 2, then knock or creak' },
    'on-a-friend': { seen: 'boing on top, she crows', heard: 'thump weight 2 on friend' },
    'in-the-sand': { seen: 'small dimple, crown over one eye', heard: 'thump weight 2 on sand' },
  },
  mog: {
    tap: { seen: 'stretches long, pads on or off', heard: 'chirp mog: a chirrup in two' },
    'low-end': { seen: 'circles once and sits side on', heard: 'thump weight 3 on plank, soft' },
    'high-end': { seen: 'tips it with a toss, or sits tall on the perch', heard: 'thump weight 3, then knock, or creak and a purr' },
    'on-a-friend': { seen: 'kneads twice, then sits', heard: 'thump weight 3 on friend, two pats' },
    'in-the-sand': { seen: 'neat round hollow, a turn in it', heard: 'thump weight 3 on sand, short' },
  },
  dot: {
    tap: { seen: 'warms to full colour, twirls, hops on or off', heard: 'chirp dot: two level notes' },
    'low-end': { seen: 'sits, brighter beside someone', heard: 'thump weight 3 on plank, then a two-note hum' },
    'high-end': { seen: 'tips it with a toss, or peeks down alone and quiet', heard: 'thump weight 3, then knock, or creak and silence' },
    'on-a-friend': { seen: 'both sway together', heard: 'thump weight 3 on friend, then a low duet' },
    'in-the-sand': { seen: 'stays warm beside a friend, or pales and draws a ring', heard: 'thump weight 3 on sand, soft' },
  },
  bo: {
    tap: { seen: 'rocks twice, thuds on or off', heard: 'chirp bo: a rumble' },
    'low-end': { seen: 'end digs a crater, ring of sand; alone he dozes', heard: 'thump weight 4 on plank, deepest; alone, a snore' },
    'high-end': { seen: 'the slam: plank whips over, everyone opposite is flung', heard: 'thump weight 4, hardest knock, whoops' },
    'on-a-friend': { seen: 'the one below is squashed flat, the stack sways', heard: 'thump weight 4 on friend, a wheeze' },
    'in-the-sand': { seen: 'wide crater, slow puff, he sinks in a little', heard: 'thump weight 4 on sand, long' },
  },
  plank: {
    tap: { seen: 'rocks once, riders bob', heard: 'creak, short' },
    'low-end': { seen: 'low end knocks on the sand, a few grains', heard: 'knock, dull and small' },
    'high-end': { seen: 'high end dips and springs back, riders bob', heard: 'creak, then a light knock' },
    'on-a-friend': { seen: 'a friend let go over the middle slides down the slope', heard: 'slide: a falling whistle' },
    'in-the-sand': { seen: 'sand thrown on it runs off the low end', heard: 'a thin hiss' },
  },
  sand: {
    tap: { seen: 'a dimple with a raised lip', heard: 'poke: a hiss and a soft tap' },
    'low-end': { seen: 'a bite mark where the end came down', heard: 'knock: the spray of grains' },
    'high-end': { seen: 'the last bite stays under the raised end', heard: 'nothing new: a mark that was already made' },
    'on-a-friend': { seen: 'thrown grains settle on heads and are shaken off', heard: 'a patter of grains' },
    'in-the-sand': { seen: 'a groove drawn by the finger, lit from the side', heard: 'drag: a dry hiss, higher when faster' },
  },
}

/** A use that is wrong for the thing and works anyway, and is at least as funny. One for each friend. */
export const WRONG_USES: Readonly<Record<'pim' | 'mog' | 'dot' | 'bo', { thing: Thing; deed: Deed; why: string }>> = {
  pim: { thing: 'pim', deed: 'high-end', why: 'sent to lift someone heavier, she dangles and kicks' },
  mog: { thing: 'mog', deed: 'on-a-friend', why: 'put on Pim, he kneads her head and she blows a raspberry' },
  dot: { thing: 'dot', deed: 'low-end', why: 'stacked on the one who wants up, it pushes that end deeper' },
  bo: { thing: 'bo', deed: 'on-a-friend', why: 'on Pim’s head, she is squashed flat and pops back' },
}
