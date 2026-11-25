import type { JamGame } from './contract'
import type { Demo } from './demos'

// How the home page helps someone find a game: shelves by what the hands do,
// and one line about each game. A game that is on no shelf yet is listed on
// the first one a visitor reads, so adding a game still takes one folder.

export type Shelf = { id: string; title: string; /** The short name on its button. */ label: string; games: Readonly<Record<string, string>> }

export const NEW_SHELF = { id: 'new', title: 'Just arrived', label: 'New' } as const

export const SHELVES: readonly Shelf[] = [
  {
    id: 'build',
    title: 'Build a world',
    label: 'Build',
    games: {
      'block-castle': 'Pile up blocks, ring the bell, and your pile becomes a castle.',
      'treetop-village': 'Hang ladders, bridges and swings in an oak for the tree folk.',
      'sand-kingdom': 'Dig and shape a beach, then let the tide come in.',
      'tape-town': 'Pull tape into roads and rivers, and the toys move in.',
      'tiny-island': 'Set down five chunky toys and watch the island join in.',
      'ice-palace': 'Saw ice, stack it, and light it up at dusk.',
      'fairy-house': 'Furnish a hollow tree with whatever the wood gives you.',
      'mushroom-village': 'Grow mushrooms with a finger and see which gnome moves in.',
      'box-fort': 'Cut, stack and tape a fort for a cat, a baby and a grandmother.',
      'bad-neighbours': 'Drop wobbly apartments and meet everyone who lives in them.',
      'kite-tower': 'Stack rainbow wood so a peg doll can reach her kite.',
    },
  },
  {
    id: 'care',
    title: 'Look after someone',
    label: 'Care',
    games: {
      'boo-boo-vet': 'See where it hurts and bring the animal what helps.',
      'muddy-truck-wash': 'Rub off the mud until every truck shines.',
      'farm-morning': 'Try everything in the shed on the hens, the pony and the goat.',
      'fire-truck-hero': 'Point the hose: fill a pool, float a duck, put out a fire.',
      'goodnight-teddy': 'Bath a muddy bear, dress it, and turn the lamp down.',
      'bedtime-forest': 'Carry six yawning animals home until the moon comes up.',
      'dress-for-weather': 'Zip, button and boot them up, then open the door to the weather.',
      'wash-day': 'Scrub, wring and peg out the muddy clothes. And the cat.',
      'shes-copying-me': 'Move one aunt’s hand and the other copies with whatever she holds.',
      'cosy-scarf': 'Knit stripes for a cold animal until it dances.',
      'something-in-the-shoe': 'Put a frog in the boot and see what the bare foot does.',
      'hats-for-all': 'Pop out foam hats until every head has one.',
    },
  },
  {
    id: 'jobs',
    title: 'Run a silly shop',
    label: 'Silly shops',
    games: {
      'crocodile-jumper': 'Lay sausages along a cold crocodile and a jumper grows on him.',
      'monster-pizza': 'Make the pizza on the card for a very hungry monster.',
      'bread-day': 'Knead, rise and bake in a badger’s bakery.',
      'tea-time': 'Pour the tea just the way each guest likes it.',
      'wild-hair-salon': 'Pull it longer, snip it shorter, whip off the cape.',
      'monster-hotel': 'Find every fussy monster a room that keeps the peace.',
      'snack-merge': 'Drop snacks in a jar until they pop into new ones.',
      'fruit-slicer': 'Slice fruit by eye to the share on the ticket.',
      'fix-it-stall': 'Clip leads and test parts until the gadget wakes up.',
      'flower-table': 'Cut a bouquet for four visitors with strong opinions.',
      'one-more-table': 'Pull the table longer and see who plops in with a dish.',
      'advent-market': 'Dip candles, fold stars, ice biscuits, and give them away.',
      'bottom-portraits': 'Turn the animals round and a grand painter paints exactly what he sees.',
      'wrap-the-cat': 'Wind paper round anything, even the cat, then rip it open.',
    },
  },
  {
    id: 'make',
    title: 'Paint, music and making',
    label: 'Make',
    games: {
      'wet-paint': 'Drop colour on water, comb it, and lift off a print.',
      'critter-clay': 'Press legs and eyes on some clay and it walks off.',
      'frog-choir': 'Move five frogs around the pond to write a song.',
      'glow-pegs': 'Draw in glowing pegs, then pull the lever to hear it.',
      'wool-picture': 'Lay wool on felt: low green is a hill, high white rains.',
      'leaf-creatures': 'Join leaves and acorn caps into a creature that wakes.',
      'chalk-train': 'Draw a line, and the chalk train rides along it.',
      'blob-dash': 'Jump a blob round a ring and it plays your rhythm back.',
      'who-made-that-sound': 'Tap the eggs and listen for who is inside.',
      'rainbow-world': 'Arches, dolls, a horse and a silk. Start a story.',
    },
  },
  {
    id: 'go',
    title: 'Dash, drop and splash',
    label: 'Dash & splash',
    games: {
      'rocket-penguin': 'Bolt anything to a penguin and let the catapult go.',
      'mother-holle': 'Shake the featherbed: where it snows, a walrus sledges.',
      'roll-it-all-up': 'Roll a snowball over the boot and the cat, and see how he walks.',
      'hungry-hole': 'Swallow a carnival, then burp it back up as a float.',
      'hop-across': 'Lead three small rabbits over roads, rivers and rails.',
      'lane-runner': 'Run a fox and its cargo around the pond.',
      'brick-buster': 'Flick a ball into bricks with faces. Wet, hot or heavy.',
      'egg-heist': 'Sneak a raccoon past a goose who punts what she sees.',
      'deep-sea-fishing': 'Pick a bait and find out who bites, steals or bolts.',
      'micro-mayhem': 'Poke a tiny house until the jokes spread room to room.',
      'claw-machine': 'Grab a toy and drop it in the gobbler that wants it.',
      'balloon-pop-parade': 'Send balloons down to friends at the seaside.',
    },
  },
  {
    id: 'puzzle',
    title: 'Puzzle it out',
    label: 'Puzzles',
    games: {
      'grandpa-tells-wrong': 'Grandpa tells the day wrong. Fix it, or let it come true.',
      'removal-bears': 'Turn the sofa to get it through the door.',
      'animals-vote': 'Everyone takes one square, and the tallest column happens to all.',
      'the-blanket': 'Cover a head, move the sausage, and see who looks where.',
      'endless-string': 'Pull out lights, boots and an uncle, hang them on a moose, hit the switch.',
      'light-garden': 'Bend beams with mirrors to wake sea-glass creatures.',
      'turning-tower': 'Twist the tower until the paths line up.',
      'shadow-lantern': 'Turn paper shapes until the shadow fits.',
      'dig-for-the-duck': 'Tunnel water through the sand to a waiting duck.',
      'gem-miner': 'Dig a cave with a mole and see who likes its light.',
      'hillside-spring': 'Lay bamboo pipes so every dry terrace blooms.',
      'bridge-crew': 'Build a balsa bridge, load it, and see if it holds.',
      'night-camp': 'Pack enough wood, oil and water to last the night.',
      'five-in-the-bed': 'Roll five sheep over the ridge until each has a straw.',
      'pebble-table': 'Clay stones, an honest scale, and guests to feed fairly.',
      'monster-telephone': 'One peeks and tells, the other builds the monster’s twin.',
      'princess-playground': 'Who can lift whom? Find out on the seesaw.',
    },
  },
  {
    id: 'wonder',
    title: 'Wander and wonder',
    label: 'Wander',
    games: {
      'lantern-walk': 'Cut a paper lantern and carry its light into the wood.',
      'nature-walk': 'Turn the seasons and look under things in a plywood wood.',
      'bark-boats': 'Build a boat from found things and follow it downstream.',
      'felt-meadow': 'Plant felt seeds and let a bee mix the colours.',
      'moon-phases': 'Turn the Earth and the moon, and look out of the window.',
      'seed-lab': 'Breed flowers in a naturalist’s journal.',
      'dark-garden': 'Carry a light into a dark garden and see who wakes up.',
    },
  },
]

// A demo stands on the shelf of the game it became; these became none.
const DEMO_SHELVES: Readonly<Record<string, string>> = {
  'animal-tower': 'build',
  'feed-the-monster': 'care',
  'whack-a-mole': 'go',
  'slingshot-smash': 'go',
  'peg-blaster': 'go',
}

const LINES: Readonly<Record<string, string>> = Object.assign({}, ...SHELVES.map((shelf) => shelf.games))

export const keyOf = (game: JamGame) => game.cartridge.manifest.key

/** The one line about a game, or nothing where none has been written yet. */
export const lineFor = (key: string): string => LINES[key] ?? ''

export const fitsAge = (game: JamGame, age: number | null): boolean => fitsBand(game.cartridge.manifest.ageBand, age)

export function fitsBand([youngest, oldest]: readonly [number, number], age: number | null): boolean {
  return age === null || (youngest <= age && age <= oldest)
}

const says = (text: string, query: string) => text.toLowerCase().includes(query.trim().toLowerCase())

export const matches = (game: JamGame, query: string): boolean => says(`${game.cartridge.manifest.name} ${lineFor(keyOf(game))}`, query)

export const demoMatches = (demo: Demo, query: string): boolean => says(`${demo.name} ${demo.pitch}`, query)

export type FilledShelf = { id: string; title: string; label: string; games: JamGame[]; /** The demos that belong here, after the games. */ demos: Demo[] }

const shelfOfGame = (key: string) => SHELVES.find((shelf) => key in shelf.games)?.id
const shelfOfDemo = (demo: Demo) => shelfOfGame(demo.game ?? demo.key) ?? DEMO_SHELVES[demo.key] ?? NEW_SHELF.id

/** Every given game and demo on exactly one shelf, in shelf order; empty shelves are left out. */
export function fillShelves(games: readonly JamGame[], demos: readonly Demo[] = []): FilledShelf[] {
  const byKey = new Map(games.map((game) => [keyOf(game), game]))
  const shelves = [{ ...NEW_SHELF, games: games.filter((game) => !(keyOf(game) in LINES)) }, ...SHELVES.map((shelf) => ({ ...shelf, games: Object.keys(shelf.games).flatMap((key) => byKey.get(key) ?? []) }))]
  return shelves
    .map(({ id, title, label, games: shelved }) => ({ id, title, label, games: shelved, demos: demos.filter((demo) => shelfOfDemo(demo) === id) }))
    .filter((shelf) => shelf.games.length + shelf.demos.length > 0)
}
