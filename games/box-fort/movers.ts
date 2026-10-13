import type { SoundId } from './voices'

// Which motion each sound may start with. A cue names its motion (`mover`),
// the view has a motion for every name here, and a test holds every cue the
// game makes to this table: no sound without a motion that is seen. A name
// ending in a star stands for one of several things of a kind (a box, a
// cushion, a strip of tape).

export const SOUND_MOVERS: Record<SoundId, readonly string[]> = {
  snip: ['cut'], bite: ['blades'], air: ['blades', 'dab'], pop: ['box:*', 'cat:pop'], slap: ['piece', 'piece:*'], roll: ['piece', 'piece:*'], clack: ['scissors'],
  mrrp: ['cat:prick', 'cat:enter'], mew: ['cat:tap', 'cat:show'], thud: ['cat:land'], peep: ['cat:show'], pat: ['cat:show', 'cat:pat'], boing: ['cat:show'], hop: ['cat:hop'],
  squeal: ['baby:squeal', 'baby:reveal'], rattle: ['baby:tap'], oh: ['gran:start'], click: ['gran:tap'], puff: ['cushion:*'],
  scrape: ['carry', 'sweep', 'piece:*'], thump: ['box:*'], knock: ['box:*'], unfold: ['box:*'], fold: ['box:*'], boom: ['box:*'], drum: ['cat:land'], purr: ['cat:purr'], hush: ['cat:burrow'],
  palms: ['baby:crawl', 'baby:pat'], giggle: ['baby:giggle', 'baby:tap'], creak: ['box:*', 'gran:wear'], cluck: ['gran:walk', 'gran:wear', 'gran:tap'],
  claws: ['cat:claws'], tumble: ['toy:*'], sproing: ['toy:*'], ooh: ['gran:walk'], bonk: ['gran:head'], bell: ['spill:*'],
  rip: ['strip'], press: ['tape:*', 'strip', 'tab'], zip: ['strip'], whirr: ['roll'], flap: ['cat:shake'], trundle: ['roll'], squeak: ['gran:thumb'], crackle: ['tape:*'], tear: ['tab'],
  whoomp: ['cloth'], settle: ['cloth'], hiss: ['cloth'], flump: ['cloth'], muffle: ['gran:covered'], warm: ['cloth'],
  whumpf: ['cushion:*'], stretch: ['box:*'], poomf: ['cushion:*'], tread: ['cat:knead'], raspberry: ['baby:flop'], wheeze: ['gran:sit'], mff: ['spill:*'],
  tink: ['bulbs', 'bulb:*', 'cat:swat'], glass: ['bulbs'], slither: ['bulbs'], jingle: ['bulbs:jump'], hum: ['gran:hum'], plink: ['bulb:*'], flick: ['switch'],
}

/** Whether a sound may start with the motion of that name. */
export function goesWith(sound: SoundId, mover: string): boolean {
  return SOUND_MOVERS[sound].some((name) => (name.endsWith('*') ? mover.startsWith(name.slice(0, -1)) : name === mover))
}

/** Every motion a sound can start, with a star standing for a number. */
export const MOVERS: readonly string[] = [...new Set(Object.values(SOUND_MOVERS).flat())]
