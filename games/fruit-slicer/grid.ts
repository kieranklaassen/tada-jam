import type { VoiceId } from './voices'

// The object-by-action grid of ART.md as data: for each of the six things and
// each of the five acts, what happens. Every cell works, none refuses, and no
// two look or sound alike. The view acts a cell out by its `show`, the sound
// by its `voice`, and the rules by its `does`. Pure.

export type Thing = 'fruit' | 'piece' | 'tin' | 'customer' | 'crate' | 'dog'
export type Act = 'slice' | 'poke' | 'give' | 'fling' | 'roll'
export const THINGS: readonly Thing[] = ['fruit', 'piece', 'tin', 'customer', 'crate', 'dog']
export const ACTS: readonly Act[] = ['slice', 'poke', 'give', 'fling', 'roll']

/** What a cell does to the world, by the rule that carries it out. `nothing` changes no state and is still answered. */
export type Does =
  | 'cut' // world.cut
  | 'layBeside' // world.setOnBoard, on the other lane from the same left end
  | 'butt' // world.setOnBoard, end to end
  | 'knock' // world.setOnBoard, further along
  | 'mark' // world.roll
  | 'serve' // cycle.give
  | 'bounce' // world.setOnBoard: the flung piece comes back to the counter
  | 'feed' // cycle.feed for the one at the window; cycle.treat for one who waits
  | 'spill' // world.landFruit, once for each kind of fruit
  | 'call' // cycle.call for one who waits; cycle.sendOff for one at the window whose tin holds a misfit
  | 'land' // cycle.crate
  | 'toDog' // world.remove: eaten, licked off or burped across, and gone (cycle.splat for a customer)
  | 'nothing'

export type Cell = {
  /** The name of what is seen, one for each cell. */
  show: string
  voice: VoiceId
  does: Does
  /** What is seen and heard instead while the tin is shut, where that differs. A shut tin changes nothing. */
  shut?: { show: string; voice: VoiceId }
}

export const GRID: Readonly<Record<Thing, Readonly<Record<Act, Cell>>>> = {
  fruit: {
    slice: { show: 'cut-in-two', voice: 'thwack', does: 'cut' },
    poke: { show: 'quiver', voice: 'quiver', does: 'nothing' },
    give: { show: 'lie-alongside', voice: 'lay', does: 'layBeside' },
    fling: { show: 'bounce-off-fruit', voice: 'boing', does: 'bounce' },
    roll: { show: 'press-parts', voice: 'ticks', does: 'mark' },
  },
  piece: {
    slice: { show: 'cut-smaller', voice: 'snick', does: 'cut' },
    poke: { show: 'ring', voice: 'pluck', does: 'nothing' },
    give: { show: 'butt-end-to-end', voice: 'butt', does: 'butt' },
    fling: { show: 'knock-along', voice: 'clack', does: 'knock' },
    roll: { show: 'press-parts-of-piece', voice: 'press', does: 'mark' },
  },
  tin: {
    slice: { show: 'skid-and-sparks', voice: 'skid', does: 'nothing' },
    poke: { show: 'jaw-snaps', voice: 'castanet', does: 'nothing', shut: { show: 'rattles-shut', voice: 'rattle' } },
    give: { show: 'spring-open', voice: 'spring', does: 'serve' },
    fling: { show: 'bong-off-lid', voice: 'bong', does: 'bounce' },
    roll: { show: 'parts-answer-one-by-one', voice: 'rule', does: 'nothing', shut: { show: 'drum-along-lid', voice: 'drum' } },
  },
  customer: {
    slice: { show: 'tuft-pops-back', voice: 'pop', does: 'nothing' },
    poke: { show: 'flinch', voice: 'babble', does: 'call' },
    give: { show: 'eat-from-hand', voice: 'gulp', does: 'feed' },
    fling: { show: 'splat-and-lick', voice: 'splat', does: 'toDog' },
    roll: { show: 'rolled-flat', voice: 'honk', does: 'nothing' },
  },
  crate: {
    slice: { show: 'slat-splits', voice: 'split', does: 'spill' },
    poke: { show: 'fruit-lands', voice: 'thump', does: 'land' },
    give: { show: 'chew-and-burp', voice: 'burp', does: 'toDog' },
    fling: { show: 'crate-rocks', voice: 'rock', does: 'land' },
    roll: { show: 'slats-rattle', voice: 'washboard', does: 'nothing' },
  },
  dog: {
    slice: { show: 'bite-the-lines', voice: 'chomp', does: 'nothing' },
    poke: { show: 'tail-and-bark', voice: 'bark', does: 'nothing' },
    give: { show: 'eat-with-cheeks', voice: 'munch', does: 'toDog' },
    fling: { show: 'catch-and-flip', voice: 'catch', does: 'toDog' },
    roll: { show: 'ears-ironed', voice: 'sproing', does: 'nothing' },
  },
}

/** What happens when this act is done to this thing. There is always an answer. With the tin shut, a cell that says so answers as shut and changes nothing. */
export function answer(thing: Thing, act: Act, tinShut = false): Cell {
  const cell = GRID[thing][act]
  return tinShut && cell.shut ? { ...cell.shut, does: 'nothing' } : cell
}
