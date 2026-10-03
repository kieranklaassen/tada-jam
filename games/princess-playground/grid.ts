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
  /** What is heard, in the sheet's own words: every cell has a sound of its own. */
  heard: string
}

export const CELLS: Readonly<Record<Thing, Readonly<Record<Deed, Cell>>>> = {
  pim: {
    tap: { seen: 'quick hop on or off, crown lagging', heard: 'a squeak up' },
    'low-end': { seen: 'end sinks a hair, she stamps', heard: 'a tiny tick' },
    'high-end': { seen: 'tips it with a small toss, or dangles kicking', heard: 'a light clack, or a trill' },
    'on-a-friend': { seen: 'lands on top and crows', heard: 'a boing and a crow' },
    'in-the-sand': { seen: 'small dimple, crown over one eye, shaken straight', heard: 'a soft pat and a tiny rattle' },
  },
  mog: {
    tap: { seen: 'stretches long, pads on or off', heard: 'a chirrup in two' },
    'low-end': { seen: 'circles once and sits', heard: 'a soft thud' },
    'high-end': { seen: 'tips it with a toss, or sits tall on the perch', heard: 'a firm knock, or a purr' },
    'on-a-friend': { seen: 'kneads the head below twice, then sits', heard: 'two muffled pats and a short chirr' },
    'in-the-sand': { seen: 'neat round hollow, one turn in it', heard: 'a dry scrunch' },
  },
  dot: {
    tap: { seen: 'warms to full colour, twirls, hops on or off; the others turn and bounce', heard: 'a rising two-note peep' },
    'low-end': { seen: 'sits, brighter beside someone; alone on the plank it peeks over at the others', heard: 'a thud and a two-note hum, which dies away if alone' },
    'high-end': { seen: 'tips it with a toss, or sways up high toward the friend opposite', heard: 'a knock with a clear ring over it, or one long high note' },
    'on-a-friend': { seen: 'sways together with the one below', heard: 'a low duet' },
    'in-the-sand': { seen: 'stays warm beside a friend, or pales and draws one ring with its foot', heard: 'a light tap, then one soft note or a faint slow scratch' },
  },
  bo: {
    tap: { seen: 'from the sand rocks twice and thuds onto his end; from the plank thuds off at once', heard: 'a rumble' },
    'low-end': { seen: 'end digs a crater, a ring of sand flies; alone on the plank he dozes', heard: 'the deepest thump; alone, a snore' },
    'high-end': { seen: 'the slam: plank whips over, everyone opposite is flung, Pim highest', heard: 'a crack with a low boom under it' },
    'on-a-friend': { seen: 'the one below is squashed flat and pops back; the stack sways', heard: 'a wheeze' },
    'in-the-sand': { seen: 'wide crater, slow puff, he sinks in a little', heard: 'a sigh' },
  },
  plank: {
    tap: { seen: 'rocks once, riders tossed a finger’s width', heard: 'a wooden creak' },
    'low-end': { seen: 'low end knocks on the sand, a few grains', heard: 'a dull clonk' },
    'high-end': { seen: 'high end dips and springs back, riders bob', heard: 'a twang' },
    'on-a-friend': { seen: 'a friend let go over the middle slides down the slope', heard: 'a rising whistle' },
    'in-the-sand': { seen: 'sand thrown on it runs off the low end in a thin stream', heard: 'a dry trickle' },
  },
  sand: {
    tap: { seen: 'a dimple with a raised lip', heard: 'a hiss' },
    'low-end': { seen: 'a bite where the end came down, deeper the heavier the end, which stays', heard: 'a crunch' },
    'high-end': { seen: 'as an end lifts, grains slide back into the bite it leaves', heard: 'a short whisper' },
    'on-a-friend': { seen: 'thrown grains settle on heads and are shaken off', heard: 'a light patter' },
    'in-the-sand': { seen: 'a groove drawn by the finger, lit from the side', heard: 'a scrape that follows the finger’s speed' },
  },
}

/** A use that is wrong for the thing and works anyway, and is at least as funny. One for each friend. */
export const WRONG_USES: Readonly<Record<'pim' | 'mog' | 'dot' | 'bo', { thing: Thing; deed: Deed; why: string }>> = {
  pim: { thing: 'pim', deed: 'high-end', why: 'sent to lift someone heavier, she dangles and kicks' },
  mog: { thing: 'mog', deed: 'on-a-friend', why: 'put on Pim, he kneads her head and she blows a raspberry' },
  dot: { thing: 'dot', deed: 'low-end', why: 'stacked on the one who wants up, it pushes that end deeper' },
  bo: { thing: 'bo', deed: 'on-a-friend', why: 'on Pim’s head, she is squashed flat and pops back' },
}
