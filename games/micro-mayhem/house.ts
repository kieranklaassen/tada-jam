// The house as rules, with no drawing and no sound in it: eight rooms, three
// doors in each, and the step each of the eight things stands at. Every rule
// is a plain function from one house to the next, and says what happened so
// that the room can show it. Nothing here reads a clock or draws chance.
// The design sheet has the same fields under "The designed order, and what is
// stored" (ART.md).

export const ROOMS = ['bedroom', 'kitchen', 'bathroom', 'garden', 'dining', 'henhouse', 'fair', 'bakery'] as const
export type RoomId = (typeof ROOMS)[number]

/** The three doors of each room, top to bottom. The map never changes. */
export const DOORS_OF: Readonly<Record<RoomId, readonly [RoomId, RoomId, RoomId]>> = {
  bedroom: ['kitchen', 'bathroom', 'garden'],
  kitchen: ['bedroom', 'dining', 'henhouse'],
  bathroom: ['bedroom', 'dining', 'fair'],
  garden: ['bedroom', 'henhouse', 'fair'],
  dining: ['kitchen', 'bathroom', 'bakery'],
  henhouse: ['kitchen', 'garden', 'bakery'],
  fair: ['bathroom', 'garden', 'bakery'],
  bakery: ['dining', 'henhouse', 'fair'],
}

export type Step3 = 0 | 1 | 2 | 3

/** How many patches the bathroom glass has, three across and four down, and the value with all of them fogged. */
export const FOG_PATCHES = 12
export const FOG_ALL = (1 << FOG_PATCHES) - 1
/** The top row, which the hot tap fogs over again. */
export const FOG_TOP = 0b111

export type House = {
  /** The room on screen. */
  place: RoomId
  /** A door has been opened since the last lights out. */
  day: boolean
  /** 0 asleep, 1 one eye open, 2 sitting up, 3 awake. */
  dog: Step3
  /** The dog has eaten the toppled pies and is round. */
  full: boolean
  /** 0 small, 1 the size of a melon, 2 swollen, 3 burst. */
  balloon: Step3
  /** 0 about, 1 swatted. */
  fly: 0 | 1
  /** 0 none, 1 one egg, 2 two eggs, 3 two eggs and the chick. */
  eggs: Step3
  /** 0 an empty tray, 1 one pie, 2 two pies, 3 toppled. */
  pies: Step3
  /** Which patches of the glass are still fogged, one bit each; bit 0 is the top left. */
  fog: number
  /** 0 in the bed, 1 stretched, 2 pulled. */
  weed: 0 | 1 | 2
  /** A flower has been picked. */
  flower: boolean
  /** 0 an empty bowl, 1 one ladle, 2 two ladles, 3 overflowed. */
  soup: Step3
  /** The baker has served a slice of the pie in his hat, and it lies on the dining table. */
  served: boolean
}

/** The house as a first visit finds it, and as the lamp leaves it: night, the bedroom, every thing at its first step. */
export const FIRST: House = { place: 'bedroom', day: false, dog: 0, full: false, balloon: 0, fly: 0, eggs: 0, pies: 0, fog: FOG_ALL, weed: 0, flower: false, soup: 0, served: false }

/** Whether every thing is at its first step, wherever the child stands. */
export function untouched(h: House): boolean {
  return h.dog === 0 && !h.full && h.balloon === 0 && h.fly === 0 && h.eggs === 0 && h.pies === 0 && h.fog === FOG_ALL && h.weed === 0 && !h.flower && h.soup === 0
}

/** What a touch came to. `step`: the thing went one step on. `punch`: it reached its last step, which is its punchline. `back`: a wrong use walked it one step back. `joke`: a wrong use that changes nothing. `again`: its own tap at the last step. */
export type Came = 'step' | 'punch' | 'back' | 'joke' | 'again'

type Out = { house: House; came: Came }

const up = (n: Step3): Step3 => Math.min(3, n + 1) as Step3
const down = (n: Step3): Step3 => Math.max(0, n - 1) as Step3

/** A thing with four steps takes one: a step, the punchline on reaching the last, or its own answer when it is there already. */
function onward(h: House, field: 'dog' | 'balloon' | 'eggs' | 'pies' | 'soup'): Out {
  const at = h[field]
  if (at === 3) return { house: h, came: 'again' }
  const next = up(at)
  return { house: { ...h, [field]: next }, came: next === 3 ? 'punch' : 'step' }
}

/** A wrong use that walks a thing back from a middle step only. At the first and the last step it is a joke and changes nothing. */
function backward(h: House, field: 'balloon' | 'eggs'): Out {
  const at = h[field]
  if (at === 0 || at === 3) return { house: h, came: 'joke' }
  return { house: { ...h, [field]: down(at) }, came: 'back' }
}

export const tapDog = (h: House): Out => onward(h, 'dog')
export const tapPump = (h: House): Out => onward(h, 'balloon')
export const tapHen = (h: House): Out => onward(h, 'eggs')
export const tapLadle = (h: House): Out => onward(h, 'soup')
/** The baker's belly at the fair. */
export const tapBellyAtFair = (h: House): Out => backward(h, 'balloon')
/** The egg basket. */
export const tapBasket = (h: House): Out => backward(h, 'eggs')

/** The tray. The third pie topples the tower, and an awake dog who is there eats the pies where they fall and is round from then on. */
export function tapTray(h: House): Out {
  const out = onward(h, 'pies')
  return out.came === 'punch' && h.dog === 3 ? { house: { ...out.house, full: true }, came: 'punch' } : out
}

/** A tap on the fly swats it. A swatted fly answers as itself. */
export function tapFly(h: House): Out {
  return h.fly === 1 ? { house: h, came: 'again' } : { house: { ...h, fly: 1 }, came: 'punch' }
}

/** One patch of the glass is rubbed. Rubbing the last one clear is the punchline; a clear glass answers as itself. */
export function rubFog(h: House, patch: number): Out | null {
  if (h.fog === 0) return { house: h, came: 'again' }
  const bit = 1 << patch
  if ((h.fog & bit) === 0) return null
  const fog = h.fog & ~bit
  return { house: { ...h, fog }, came: fog === 0 ? 'punch' : 'step' }
}

/** The hot tap fogs the top row over again, at any step. */
export function tapHotTap(h: House): Out {
  return { house: { ...h, fog: h.fog | FOG_TOP }, came: 'back' }
}

/** A finger takes hold of the weed: in the bed, it stretches. */
export function holdWeed(h: House): Out {
  return h.weed === 0 ? { house: { ...h, weed: 1 }, came: 'step' } : { house: h, came: 'again' }
}

/** The stretched weed is pulled all the way up. */
export function pullWeed(h: House): Out | null {
  return h.weed === 1 ? { house: { ...h, weed: 2 }, came: 'punch' } : null
}

/** A flower, not the weed. The first one comes up; after that the others only start. */
export function tapFlower(h: House): Out {
  return h.flower ? { house: h, came: 'joke' } : { house: { ...h, flower: true }, came: 'step' }
}

/** Whether the dog is on his feet and so goes ahead through every door. */
export const dogAbout = (h: House): boolean => h.dog === 3

/** Who sits at the table: the dog when he is awake, and the hen when he is not. */
export const diner = (h: House): 'dog' | 'hen' => (dogAbout(h) ? 'dog' : 'hen')

/** The fly is in the soup: not swatted, soup served, and no picked flower for it to sit on. */
export const flyInSoup = (h: House): boolean => h.fly === 0 && h.soup > 0 && !h.flower
/** The fly sits on the flower in the vase: the third meeting. */
export const flyOnFlower = (h: House): boolean => h.fly === 0 && h.flower

/** What the baker has on his head by day: the burst balloon, with the top pie in it when the tower came down too. */
export function bakerWears(h: House): 'cap' | 'rubber' | 'rubberPie' {
  return h.balloon === 3 ? (h.pies === 3 ? 'rubberPie' : 'rubber') : 'cap'
}
/** The pie is on his face only when there was no rubber hat to catch it. */
export const pieOnFace = (h: House): boolean => h.pies === 3 && h.balloon !== 3

/**
 * Through door `door` of the room on screen. The first door opened at night is the morning. An awake dog goes
 * ahead, and where he arrives at toppled pies he eats them. A baker with a pie in his rubber hat serves a slice
 * of it the first time the dining room is entered, and the slice stays on the table.
 */
export function goThrough(h: House, door: 0 | 1 | 2): { house: House; morning: boolean; eats: boolean; serves: boolean } {
  const place = DOORS_OF[h.place][door]
  const eats = dogAbout(h) && !h.full && place === 'bakery' && h.pies === 3
  const serves = place === 'dining' && bakerWears(h) === 'rubberPie' && !h.served
  return { house: { ...h, place, day: true, full: h.full || eats, served: h.served || serves }, morning: !h.day, eats, serves }
}

/** The lamp: the bedroom, night, and every thing at its first step. */
export function lightsOut(): House {
  return { ...FIRST }
}
