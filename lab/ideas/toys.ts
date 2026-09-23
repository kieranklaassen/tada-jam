// About 40 real physical toys and playground games. Physical-toy ideas start
// from one of these, partitioned across the eight ideators so their ideas
// start from different toys.

import type { Engine } from './engines.ts'

export interface Toy {
  id: string
  name: string
  // The physical behaviour a loop could borrow.
  behaviour: string
}

export const TOYS: readonly Toy[] = [
  { id: 'marble-run', name: 'Marble run', behaviour: 'Marbles roll, split at forks, drop, collide, and speed up on slopes.' },
  { id: 'wooden-blocks', name: 'Wooden blocks', behaviour: 'Blocks stack, lean, balance on edges, and topple all at once.' },
  { id: 'see-saw', name: 'See-saw', behaviour: 'A plank on a pivot tips toward the heavier end; two riders trade height.' },
  { id: 'hopscotch', name: 'Hopscotch', behaviour: 'A chalk pattern of squares you hop through on one or two feet, throwing a marker ahead.' },
  { id: 'tag', name: 'Tag', behaviour: 'One chaser, everyone else flees; a touch passes the role on.' },
  { id: 'hide-and-seek', name: 'Hide and seek', behaviour: 'One hides, one searches; being found or staying hidden is the whole game.' },
  { id: 'sandpit', name: 'Sandpit', behaviour: 'Sand digs, piles, holds a shape when damp, and slumps when dry.' },
  { id: 'water-play', name: 'Water play', behaviour: 'Water pours, fills to a level, floats things, splashes, and finds the low point.' },
  { id: 'dominoes', name: 'Dominoes', behaviour: 'Tiles set on end topple in a chain; spacing and turns decide how far it runs.' },
  { id: 'string-figures', name: 'String figures', behaviour: 'A loop of string over the fingers turns into shapes through a fixed set of moves.' },
  { id: 'slinky', name: 'Slinky', behaviour: 'A coil stretches, walks down stairs, and sends a wave from end to end.' },
  { id: 'kite', name: 'Kite', behaviour: 'Wind lifts it; string tension and steering decide where it flies and when it dives.' },
  { id: 'shadow-puppets', name: 'Shadow puppets', behaviour: 'Hands or shapes between a light and a wall make silhouettes that change with distance.' },
  { id: 'spinning-top', name: 'Spinning top', behaviour: 'A top spins, wobbles as it slows, and knocks into others.' },
  { id: 'jump-rope', name: 'Jump rope', behaviour: 'A rope swings in an arc; you jump at the right beat and keep the rhythm.' },
  { id: 'bubbles', name: 'Bubbles', behaviour: 'Blown bubbles float, drift, merge when they touch, and pop.' },
  { id: 'puddle-jumping', name: 'Puddle jumping', behaviour: 'A jump into a puddle throws a splash and ripples that grow with the jump.' },
  { id: 'leaf-boats', name: 'Leaf boats', behaviour: 'A leaf floats down a stream, catches on rocks, and spins in eddies.' },
  { id: 'clay', name: 'Clay', behaviour: 'Clay squashes, rolls, joins, and mixes colours when kneaded together.' },
  { id: 'paper-airplane', name: 'Paper airplane', behaviour: 'Folds change how it glides, loops, or dives when thrown.' },
  { id: 'tin-can-telephone', name: 'Tin can telephone', behaviour: 'A taut string carries a voice between two cans; slack cuts it off.' },
  { id: 'swing', name: 'Swing', behaviour: 'Pumping at the right moment builds height; mistimed pumping kills it.' },
  { id: 'building-bricks', name: 'Interlocking bricks', behaviour: 'Bricks snap together in any direction to build shapes bigger than one piece.' },
  { id: 'peekaboo', name: 'Peekaboo', behaviour: 'Something vanishes behind hands or a cloth and reappears, with delight in the timing.' },
  { id: 'tug-of-war', name: 'Tug of war', behaviour: 'Two sides pull a rope; the knot moves toward the stronger side.' },
  { id: 'peg-solitaire', name: 'Peg solitaire', behaviour: 'Pegs jump over neighbours and remove them until few or one remain.' },
  { id: 'kaleidoscope', name: 'Kaleidoscope', behaviour: 'Bits of colour are mirrored and rotated into patterns that change with each turn.' },
  { id: 'magnets', name: 'Magnets', behaviour: 'Magnets pull or push at a distance, through a table, and snap together.' },
  { id: 'balloon-keepy-uppy', name: 'Balloon keepy-uppy', behaviour: 'A balloon drifts down slowly; you tap it to keep it up and it never goes quite where you aim.' },
  { id: 'pinball', name: 'Pinball', behaviour: 'A ball ricochets off bumpers, and flippers give a moment to steer it.' },
  { id: 'pick-up-sticks', name: 'Pick-up sticks', behaviour: 'Sticks lie in a heap; you lift one without moving any other.' },
  { id: 'memory-cards', name: 'Memory cards', behaviour: 'Cards lie face down; you turn two at a time to find a matching pair.' },
  { id: 'dress-up', name: 'Dress-up', behaviour: 'Hats, capes, and props mix and match into characters.' },
  { id: 'seed-planting', name: 'Planting seeds', behaviour: 'A seed in soil with water and light becomes something different each time.' },
  { id: 'shape-sorter', name: 'Shape sorter', behaviour: 'Shapes fit only through matching holes; a wrong shape stays put.' },
  { id: 'wind-up-toy', name: 'Wind-up toy', behaviour: 'You wind a key, let go, and it walks, wobbles, and runs down.' },
  { id: 'spin-art', name: 'Spin art', behaviour: 'Paint dropped on a spinning disc flings outward into streaks.' },
  { id: 'ant-farm', name: 'Ant farm', behaviour: 'Ants dig tunnels and carry things with no plan, and a colony shape appears.' },
  { id: 'firefly-jar', name: 'Catching fireflies', behaviour: 'Lights drift and blink; a cupped hand or jar catches one, gently, and lets it go.' },
  { id: 'clapping-games', name: 'Clapping games', behaviour: 'Call-and-response hand claps with a rhythm that speeds up and gains steps.' },
]

// Five toys per engine, disjoint, covering all 40. An ideator's five
// physical-toy ideas start from its own five toys, one each.
export const TOY_PARTITIONS: Readonly<Record<Engine, readonly string[]>> = {
  emergence: ['dominoes', 'ant-farm', 'pinball', 'bubbles', 'spinning-top'],
  combination: ['building-bricks', 'clay', 'string-figures', 'dress-up', 'marble-run'],
  mastery: ['jump-rope', 'balloon-keepy-uppy', 'swing', 'pick-up-sticks', 'hopscotch'],
  mystery: ['shadow-puppets', 'kaleidoscope', 'hide-and-seek', 'magnets', 'tin-can-telephone'],
  'other-minds': ['tag', 'tug-of-war', 'peekaboo', 'firefly-jar', 'clapping-games'],
  expression: ['sandpit', 'spin-art', 'water-play', 'leaf-boats', 'puddle-jumping'],
  variation: ['kite', 'paper-airplane', 'wind-up-toy', 'seed-planting', 'memory-cards'],
  'rule-play': ['see-saw', 'wooden-blocks', 'shape-sorter', 'peg-solitaire', 'slinky'],
}
