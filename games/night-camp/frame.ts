import { cardHome, type Board } from './board'
import type { CamperId, Supply } from './world'

// One frame of the toy, as the view needs it: plain numbers, worked out by
// the toy (toy.ts) and the motion of each character (motion.ts), and drawn by
// the view (look.ts). The view holds no state of its own beyond its cached
// layers, so a frame drawn twice is the same picture.

/** A supply on its rod. */
export type RowFrame = {
  /** How much lies on the rod, in units from the pile: whole pieces for logs, the length of the band for oil and water. */
  length: number
  /** 0 to 1 and a little over: how far the newest log has popped out. Bands ignore it. */
  pop: number
  /** A settling wave on its way back to the pile: where its crest is, in units, and how strong it still is (0 is none). */
  waveAt: number
  wave: number
  /** A strength that dies away from 1 to 0: how hard the pile is rattling. */
  rattle: number
  /** 0 to 1: the lagging slosh of the band's far end, signed: positive leans forward. */
  slosh: number
  /** Pieces on their way home to the pile, each with the length of the row it was the end of (so its middle was half a unit short of that) and 0 to 1 of its hop. */
  flying: readonly { from: number; t: number }[]
  /** Pieces tumbled into a heap past the end of the rod. */
  heap: number
  /** The finger holds this row: its shadow falls further. */
  held: boolean
  /** A piece that was tapped: which one (in units from the pile), or -1 when none, and how far through its answer it is from 0 to 1. */
  tapped: number
  tap: number
}

/** A camper, in channels the view turns into a pose. What each channel moves is the camper's own. */
export type CamperFrame = {
  /** -1 to 1: breathing, the bag swelling and sinking. */
  breath: number
  /** The head's turn, in radians, from where it rests. */
  head: number
  /** How far through its own idle act the camper is, from 0 to 1 (a page turned, a bobble twitched, a spoon twirled, a feather swayed, ears wiggled); 0 between acts. */
  idle: number
  /** How far out the answer to a poke is: 0 at rest, 1 fully out, a little over on an overshoot. Its shape over time is the camper's own (motion.ts). */
  poke: number
}

export type ToyFrame = {
  rows: Record<Supply, RowFrame>
  campers: Record<CamperId, CamperFrame>
  /** The dog: where it is on the surface, which way it faces, its tail from -1 to 1, how far through a sniff it is from 0 to 1, how far through its trot cycle, and how far through a poked spin from 0 to 1. */
  dog: { x: number; y: number; turn: number; tail: number; sniff: number; trot: number; poke: number }
  /** The frog: its throat from 0 to 1, and 0 to 1 of a hop into the pool and back. */
  frog: { throat: number; hop: number }
  /** The mule: an ear from -1 to 1, its tail, where its head is turned (0 the map, 1 the heap, 2 the sled), 0 to 1 sitting down, and how far out its bray is (0 at rest, 1 fully out, shaped its own way). */
  mule: { ear: number; tail: number; look: number; sit: number; poke: number }
  /** Strengths that die away from 1 to 0: the kettle's lid rattling, the fire's stones shuffling. */
  kettle: number
  fire: number
  /** The compass needle's turn in radians from where it rests. */
  needle: number
  /** A strength that dies away from 1 to 0: a tent's guy lines twanging. */
  tents: Record<CamperId, number>
  /** 0 to 1, going round: where the glints on the stream are. */
  stream: number
  /** The idle ladder: 0 to 1 of the glow on the piles, and the ghost hand, or none. */
  glow: number
  hand: { x: number; y: number; press: number; opacity: number } | null
}

const row = (): RowFrame => ({ length: 0, pop: 1, waveAt: 0, wave: 0, rattle: 0, slosh: 0, flying: [], heap: 0, held: false, tapped: -1, tap: 0 })
const camper = (): CamperFrame => ({ breath: 0, head: 0, idle: 0, poke: 0 })

/** A frame with everything at rest, the dog where it is told. The picture before the save has been read, and the base of every test. */
export function restFrame(dog: { x: number; y: number; turn: number }): ToyFrame {
  return {
    rows: { logs: row(), oil: row(), water: row() },
    campers: { reader: camper(), sleeper: camper(), cook: camper(), scout: camper(), small: camper() },
    dog: { ...dog, tail: 0, sniff: 0, trot: 0, poke: 0 },
    frog: { throat: 0, hop: 0 },
    mule: { ear: 0, tail: 0, look: 0, sit: 0, poke: 0 },
    kettle: 0,
    fire: 0,
    needle: 0,
    tents: { reader: 0, sleeper: 0, cook: 0, scout: 0, small: 0 },
    stream: 0,
    glow: 0,
    hand: null,
  }
}

// --- The game on the toy ------------------------------------------------------
//
// One frame of the whole game: the toy's frame, and with it the rest of the
// kit, the night, and what every camper is doing. Still plain numbers. Three
// kinds of number are used and each field says which it is:
//   how far through   0 at the start of a thing to 1 at its end
//   how far out       0 at rest to 1 fully out, shaped by the model
//   a strength        1 when a thing is set off, dying away to 0

/** So many pieces for so many hours, as an amount card shows it. */
export type AmountFrame = { pieces: number; hours: number }
/** A number that may carry a half: a fraction of two whole numbers in lowest terms. */
export type Part = { num: number; den: number }
export type SideFrame = 'halved' | 'single' | 'doubled'

/** A lantern: where it is (on its pin, or in the hand), its wick, whether it burns, how far its light reaches now, and a strength for the click of its wick. */
export type LanternFrame = { x: number; y: number; wick: 0 | 1; lit: boolean; reach: number; held: boolean; click: number }

/** An amount card: where it is, the side it lies on, how far through a flip it is, and what it shows on its single side. */
export type CardFrame = { x: number; y: number; held: boolean; side: SideFrame; flip: number; amount: AmountFrame }

/** One card's row of a pencilled strip: the amount of the card that made it, whether that is the card the dial stands on now, and each stamp with the side that made it and the totals it reached. */
export type StripFrame = { card: number; amount: AmountFrame; current: boolean; stamps: { side: SideFrame; hours: Part; pieces: Part }[] }

/** What the night has used so far, laid as ash under the hours it burned in. */
export type AshFrame = {
  /** A burner: the amount it burns at, and until what hour it has burned so far. */
  fire: { amount: AmountFrame; until: number } | null
  lantern: { amount: AmountFrame; until: number } | null
  /** The kettle: each round poured so far, with its hour and the cups that were poured. */
  kettle: { hour: number; cups: number; wanted: number }[] | null
}

/**
 * Where a camper is and what it is doing. `act` is an act of tastes.ts (what the plan makes the camper do in the
 * night), or `at-dusk` (how its want shows before any night), `wakes-rested` or `wakes-frazzled` (the morning), or
 * null while it only lies in its bag.
 */
export type CamperPlace = {
  /** Where the camper is now and which way it lies or faces. At rest this is its place beside its tent. */
  x: number; y: number; turn: number
  /** The act it is in, how many seconds of game time it has been in it, and whose tent it is at, for the small one moved in. */
  act: string | null; actAge: number; withCamper: string | null
  /** How far through a step it is while it walks, going round from 0 to 1; 0 while it does not walk. */
  walk: number
}

/** A raccoon: where it is, which way it faces, how far through a step, and what it has taken. */
export type RaccoonFrame = { x: number; y: number; turn: number; walk: number; has: 'nothing' | 'tin' | 'marshmallow' | 'pan'; hop: number }

/** A short show the world puts on: a wrong use of the grid, a refusal, a flare. `kind` is the result id of grid.ts or one of the game's own; `t` is how far through it is. */
export type EffectFrame = { kind: string; x: number; y: number; t: number; who: string | null; seed: number }

export type GameFrame = ToyFrame & {
  /** The night: the hour the cursor stands at, how strong the film over the map is (0 at dusk, 1 in the night), whether the cursor is held, and a strength for the owl's hoot. */
  night: { hour: number; film: number; held: boolean; hoot: number; morning: boolean }
  /** The fire: its dial's setting and how far through a turn to it the knob is, whether it burns, how far its circle reaches, and a strength for a flare. */
  blaze: { setting: number; knob: number; lit: boolean; reach: number; flare: number }
  lanterns: LanternFrame[]
  /** The amount cards, for the users the site has. */
  cards: Partial<Record<'fire' | 'lantern' | 'kettle', CardFrame>>
  /** A user's rows, one a card, in the order their last stamp was laid. */
  strips: Record<'fire' | 'lantern' | 'kettle', StripFrame[]>
  ash: AshFrame
  /** The pins on the ruler where a user ran out: the hour, or null, and how far through its drop a pin is. */
  rulerPins: Record<'fire' | 'lantern' | 'kettle', { hour: number; drop: number } | null>
  /** How far through unfolding or folding a section the ruler is (1 when it lies flat). */
  rulerFold: number
  /** Where each camper is and what it does. The toy's `campers` still carries its breath, head, idle act and poke. */
  places: Record<CamperId, CamperPlace>
  raccoons: RaccoonFrame[]
  /** Pairs of eyes in the dark, each a point. */
  eyes: { x: number; y: number }[]
  /** Moths round each lit lantern: how many. */
  moths: number[]
  /** The snack tin: a strength for its lid popping; and the marshmallow trail, as points. */
  tin: number
  /** Where the snack tin is: lying in its place, on the back of the raccoon that took it, or carried into the cold fire ring for the picnic. */
  tinAt: 'home' | 'taken' | 'ring'
  /** The kettle has been poured dry: its lid is off and nothing is in it. It stays so into the morning. */
  kettleDry: boolean
  trail: { x: number; y: number }[]
  /** What the finger carries, or null. */
  carried: { thing: 'log' | 'flask' | 'can' | 'marshmallow' | 'card' | 'lantern'; x: number; y: number } | null
  /** The sled's load, front to tail, in places; a strength for a piece sliding off its tail; null at a site without a sled. */
  sled: { load: { supply: Supply; places: number }[]; refuse: number; strapped: boolean } | null
  /** How tall the tower strapped on the mule is, in places on the sled; 0 is none. */
  tower: number
  /** What the whole tower is made of, in places on the sled: so many of logs, of oil and of water. */
  towerOf: { logs: number; oil: number; water: number }
  /** The folded edge: how far the corner is pulled toward turning the sheet (0 to 1), and how far through packing up the camp is. */
  fold: { pull: number; packing: number }
  effects: EffectFrame[]
  /** Where the idle ladder's glow lies: a soft halo round each of these places, as strong as `glow`. */
  halos: { x: number; y: number; r: number }[]
  /** The scout showing a neat way: the move, how far through it is, or null. */
  showing: { move: string; t: number } | null
}

/** The frame of a board at rest: dusk, bare rods, every card at home on its single side, each lantern on its own pin with a low wick, every camper lying where it lies. */
export function restGameFrame(board: Board): GameFrame {
  const site = board.site, toy = restFrame({ ...board.dog.at, turn: board.dog.turn })
  const places = {} as Record<CamperId, CamperPlace>
  for (const who of ['reader', 'sleeper', 'cook', 'scout', 'small'] as const) {
    const lying = board.campers.find((camper) => camper.who === who)
    places[who] = { x: lying ? lying.at.x : 0, y: lying ? lying.at.y : 0, turn: lying ? lying.turn : 0, act: null, actAge: 0, withCamper: null, walk: 0 }
  }
  const cards: GameFrame['cards'] = {}
  const card = (user: 'fire' | 'lantern' | 'kettle', amount: AmountFrame): CardFrame => ({ ...cardHome(board, user), held: false, side: 'single', flip: 1, amount })
  cards.fire = card('fire', site.fire[0].amount)
  if (site.lanterns > 0) cards.lantern = card('lantern', site.wicks[0].amount)
  if (site.kettle) cards.kettle = card('kettle', { pieces: site.kettle.cups * site.tents.length, hours: site.kettle.everyHours })
  return {
    ...toy,
    night: { hour: 0, film: 0, held: false, hoot: 0, morning: false },
    blaze: { setting: 0, knob: 1, lit: false, reach: board.reach[0], flare: 0 },
    lanterns: Array.from({ length: site.lanterns }, (_, i) => ({ ...board.pins[i], wick: 0 as const, lit: false, reach: board.lampLow, held: false, click: 0 })),
    cards,
    strips: { fire: [], lantern: [], kettle: [] },
    ash: { fire: null, lantern: null, kettle: null },
    rulerPins: { fire: null, lantern: null, kettle: null },
    rulerFold: 1,
    places,
    raccoons: [],
    eyes: [],
    moths: [],
    tin: 0,
    tinAt: 'home',
    kettleDry: false,
    trail: [],
    carried: null,
    sled: board.sled ? { load: [], refuse: 0, strapped: site.given !== null } : null,
    tower: 0,
    towerOf: { logs: 0, oil: 0, water: 0 },
    fold: { pull: 0, packing: 0 },
    effects: [],
    halos: [],
    showing: null,
  }
}
