import { PLACE_IDS, RING, THINGS, type PlaceId, type ThingId } from './yard'

// The grid of the design sheet as one timeline a cell: six things by five
// places, thirty outcomes, each a list of acts on the scene's own seconds.
// An act says who does what, from when, for how long, and which sound it
// makes as it starts. The model plays the sounds from this list, the frame
// draws the figures from this list, and a test walks every act of every cell
// and fails when a sound has no maker drawn doing it. Nothing here draws and
// nothing here is chance.

/** Who can act in a pairing: the place's owner, the thing itself, or a small prop that is there only while it acts. */
export type Actor =
  | 'goose' | 'frog' | 'dog' | 'tail' | 'crow' | 'scarecrow' | 'line' | 'pole' | 'nest' | 'bowl' | 'thing'
  | 'feathers' | 'leaves' | 'bubble' | 'splash' | 'earth' | 'sparrow' | 'drip' | 'flags'

export type Act = {
  /** Seconds after the thing has gone into the place. */
  at: number
  len: number
  who: Actor
  /** The name of the move, drawn by gestures.ts. */
  does: string
  /** The sound it makes as it starts: a name in voices.ts. */
  sound?: string
}

export type Cell = {
  acts: readonly Act[]
  /** When the whole outcome is over. */
  ends: number
  /** The part that plays when the pairing is one of a round: about a second and a half of it. */
  short: readonly [number, number]
  /** From when the thing is shown as the pairing leaves it (the pecked potato, the leaf collar), where that differs from the plain thing. */
  turns?: number
}

const a = (at: number, len: number, who: Actor, does: string, sound?: string): Act => (sound === undefined ? { at, len, who, does } : { at, len, who, does, sound })

/** How long a thing takes to go into a place, from the paws or from the place before, before the outcome starts. */
export const GOES_IN = 0.45
/** The longest a pairing of a round plays for, after the thing has gone in. */
export const SHORT = 1.45

export const GRID: Record<ThingId, Record<PlaceId, Cell>> = {
  ball: {
    nest: { ends: 3.8, short: [0.9, 2.35], acts: [a(0.1, 0.6, 'goose', 'sit', 'featherSettle'), a(0.9, 1.3, 'goose', 'rideBack', 'rubberSqueaks'), a(0.9, 1.3, 'thing', 'rollUnder'), a(2.4, 1.2, 'goose', 'proud', 'proudHonk')] },
    pond: { ends: 3.8, short: [1.5, 2.95], acts: [a(0, 0.5, 'thing', 'plop', 'plop'), a(0, 0.6, 'splash', 'small'), a(0.6, 0.8, 'thing', 'bob'), a(1.5, 0.5, 'frog', 'hopOn', 'frogBoing'), a(2.1, 1.6, 'frog', 'patter', 'patter'), a(2.1, 1.6, 'thing', 'spin')] },
    scarecrow: { ends: 3.6, short: [1.2, 2.65], acts: [a(0, 0.4, 'thing', 'stick', 'pegPop'), a(0, 0.5, 'scarecrow', 'tall'), a(0.6, 0.5, 'crow', 'flyUp', 'crowFlap'), a(1.2, 2.2, 'crow', 'runOnSpot', 'boings'), a(1.2, 2.2, 'thing', 'wobble')] },
    bowl: { ends: 3.6, short: [0.5, 1.95], acts: [a(0.1, 0.4, 'dog', 'pounce', 'thump'), a(0.5, 0.5, 'thing', 'squirt', 'squirt'), a(1.1, 1.5, 'dog', 'noseRound', 'threeYaps'), a(1.1, 1.5, 'thing', 'roundBowl'), a(2.8, 0.8, 'dog', 'chinOn', 'dogSigh')] },
    line: { ends: 3.6, short: [0.9, 2.35], acts: [a(0, 0.4, 'thing', 'pegIn', 'pegClip'), a(0.7, 2.7, 'thing', 'kneeSwing', 'wind'), a(0.7, 2.7, 'line', 'gust'), a(1.2, 0.3, 'pole', 'knocked', 'bonk'), a(2.2, 0.3, 'pole', 'knocked', 'bonkLower')] },
  },
  potato: {
    nest: { ends: 3.5, short: [0.1, 1.55], acts: [a(0.1, 0.7, 'goose', 'knock', 'tokTok'), a(0.9, 0.6, 'goose', 'listen'), a(1.6, 0.4, 'goose', 'shrug', 'shrugHm'), a(2.2, 1.2, 'goose', 'sitLopsided', 'lowCluck')] },
    pond: { ends: 3.7, short: [2.2, 3.65], acts: [a(0, 0.8, 'thing', 'sink', 'glug'), a(1.0, 0.5, 'bubble', 'rise'), a(1.5, 0.2, 'bubble', 'pop', 'blip'), a(1.7, 0.5, 'bubble', 'rise'), a(2.2, 0.2, 'bubble', 'pop', 'blipHigher'), a(2.4, 0.7, 'bubble', 'toFrog'), a(3.1, 0.5, 'frog', 'flinch', 'nosePop')] },
    scarecrow: { ends: 3.8, turns: 3.1, short: [1.9, 3.35], acts: [a(0, 0.4, 'thing', 'layInHand', 'pat'), a(0.5, 1.2, 'crow', 'walkArm', 'crowSteps'), a(1.9, 1.2, 'crow', 'peckThree', 'tkTkTk'), a(3.2, 0.6, 'crow', 'hopHomeFromHand', 'crowFlap')] },
    bowl: { ends: 3.6, short: [1.7, 3.15], acts: [a(0.1, 0.5, 'dog', 'bite', 'crunch'), a(0.1, 1.7, 'thing', 'inMouth'), a(0.8, 0.8, 'dog', 'longFace', 'whine'), a(1.8, 0.4, 'dog', 'spit', 'pthoo'), a(1.8, 0.4, 'thing', 'spatBack'), a(2.5, 0.8, 'dog', 'shove', 'scrape'), a(2.5, 0.8, 'bowl', 'shoved')] },
    line: { ends: 3.6, short: [0.5, 1.95], acts: [a(0, 0.4, 'thing', 'pegIn', 'pegClip'), a(0.5, 0.9, 'line', 'sag', 'creakDown'), a(1.5, 0.8, 'line', 'slideIn', 'zip'), a(2.5, 1.0, 'thing', 'dangle', 'lowBoing')] },
  },
  clock: {
    nest: { ends: 4.8, short: [2.2, 3.65], acts: [a(0.1, 0.6, 'goose', 'sit', 'featherSettle'), a(0.8, 1.4, 'thing', 'tickUnder', 'muffledTicks'), a(2.3, 1.0, 'thing', 'ring', 'ring'), a(2.3, 1.0, 'goose', 'shootUp', 'squawk'), a(2.3, 1.2, 'feathers', 'burst'), a(3.5, 1.2, 'goose', 'glare', 'hmphLow')] },
    pond: { ends: 3.6, short: [0, 1.45], acts: [a(0, 1.0, 'thing', 'sink', 'gargledRing'), a(0.4, 3.0, 'frog', 'coverEars'), a(1.1, 0.4, 'bubble', 'rise'), a(1.5, 0.2, 'bubble', 'pop', 'ting'), a(1.8, 0.4, 'bubble', 'rise'), a(2.2, 0.2, 'bubble', 'pop', 'tingHigher'), a(2.5, 0.4, 'bubble', 'rise'), a(2.9, 0.2, 'bubble', 'pop', 'tingHighest')] },
    scarecrow: { ends: 4.2, short: [2.2, 3.65], acts: [a(0, 0.4, 'thing', 'hangOnNeck', 'clink'), a(0.6, 1.6, 'thing', 'tock', 'loudTocks'), a(0.6, 1.6, 'crow', 'nodInTime'), a(2.4, 0.9, 'thing', 'ring', 'ringHigh'), a(2.5, 0.8, 'crow', 'fallOff', 'clatter'), a(3.5, 0.6, 'crow', 'hopHomeFromFloor', 'crowFlap')] },
    bowl: { ends: 4.2, short: [1.3, 2.75], acts: [a(0.1, 1.0, 'thing', 'tick', 'bowlTicks'), a(0.1, 1.0, 'dog', 'cockHead'), a(1.3, 1.4, 'thing', 'ring', 'ringRising'), a(1.3, 1.4, 'dog', 'howl', 'howl'), a(2.9, 0.4, 'dog', 'pawOn', 'clunk'), a(3.4, 0.8, 'tail', 'wagHard', 'tailThumps')] },
    line: { ends: 3.8, short: [2.35, 3.8], acts: [a(0, 0.4, 'thing', 'pegIn', 'clink'), a(0.5, 1.9, 'thing', 'pendulum', 'tickTock'), a(2.6, 1.1, 'thing', 'ring', 'ringThin'), a(2.6, 1.1, 'line', 'chatter', 'pegChatter')] },
  },
  boot: {
    nest: { ends: 3.9, short: [1.0, 2.45], acts: [a(0.1, 0.7, 'goose', 'peerIn', 'pokeIn'), a(1.0, 1.8, 'goose', 'stagger', 'hollowHonks'), a(1.0, 1.8, 'thing', 'onHead'), a(3.0, 0.7, 'goose', 'shakeOff', 'bootFlop'), a(3.0, 0.7, 'thing', 'dropOff')] },
    pond: { ends: 4.3, short: [1.5, 2.95], acts: [a(0, 3.1, 'thing', 'floatHigh', 'deepPlop'), a(0, 0.6, 'splash', 'small'), a(1.5, 0.6, 'frog', 'hopIn', 'frogBoing'), a(2.2, 0.8, 'frog', 'captain', 'hornCroak'), a(3.1, 1.2, 'thing', 'settleLow', 'trickle'), a(3.1, 1.2, 'frog', 'sinkWith')] },
    scarecrow: { ends: 4.6, short: [2.5, 3.95], acts: [a(0, 0.5, 'thing', 'hatOn', 'clomp'), a(0.3, 0.8, 'scarecrow', 'giant', 'creakUp'), a(1.2, 0.6, 'crow', 'caw', 'caw'), a(1.9, 0.6, 'goose', 'lookUp'), a(2.5, 0.4, 'goose', 'squawk', 'squawk'), a(2.9, 0.5, 'goose', 'dive', 'greatSplash'), a(2.9, 0.7, 'splash', 'great'), a(3.4, 0.55, 'goose', 'climbOut', 'shakeDry')] },
    bowl: { ends: 4.1, short: [0.6, 2.05], acts: [a(0.1, 0.4, 'dog', 'grab', 'snap'), a(0.6, 1.5, 'dog', 'shakeIt', 'growlFlaps'), a(0.6, 1.5, 'thing', 'shaken'), a(2.3, 0.7, 'dog', 'lieDown', 'flopDown'), a(3.1, 1.0, 'dog', 'chew', 'chews')] },
    line: { ends: 3.6, short: [1.7, 3.15], acts: [a(0, 0.4, 'thing', 'pegIn', 'pegClip'), a(0.8, 0.8, 'sparrow', 'flyIn', 'flutter'), a(1.7, 0.5, 'sparrow', 'tweet', 'tweet'), a(2.5, 0.4, 'drip', 'fall', 'plink'), a(3.1, 0.4, 'drip', 'fall', 'plinkLower')] },
  },
  cabbage: {
    nest: { ends: 4.2, turns: 1.7, short: [0.1, 1.55], acts: [a(0.1, 0.5, 'goose', 'tear', 'rip'), a(0.1, 0.9, 'leaves', 'fly'), a(0.7, 0.4, 'goose', 'munch', 'munch'), a(1.2, 0.4, 'goose', 'munch', 'munchLower'), a(1.7, 0.5, 'goose', 'tear', 'ripHigher'), a(1.7, 0.9, 'leaves', 'fly'), a(2.6, 0.7, 'goose', 'sit', 'featherSettle'), a(3.4, 0.7, 'goose', 'burp', 'burp')] },
    pond: { ends: 3.7, short: [0.8, 2.25], acts: [a(0, 0.5, 'thing', 'plop', 'softPlop'), a(0.8, 0.6, 'frog', 'hopOnPad', 'leafyFlop'), a(1.5, 0.5, 'frog', 'ribbit', 'ribbit'), a(2.1, 1.6, 'thing', 'turnSlowly'), a(2.1, 1.6, 'frog', 'ridePad')] },
    scarecrow: { ends: 3.6, turns: 3.0, short: [0.8, 2.25], acts: [a(0, 0.4, 'thing', 'hatOn', 'flump'), a(0.1, 0.5, 'scarecrow', 'tall'), a(0.8, 0.5, 'crow', 'pull', 'rip'), a(0.8, 0.8, 'leaves', 'drop'), a(1.4, 0.5, 'crow', 'pull', 'ripHigher'), a(1.4, 0.8, 'leaves', 'drop'), a(2.0, 0.5, 'crow', 'pull', 'ripLower'), a(2.0, 0.8, 'leaves', 'drop'), a(2.6, 0.5, 'crow', 'pull', 'ripHighest'), a(2.6, 0.8, 'leaves', 'drop'), a(3.0, 0.5, 'scarecrow', 'shrink')] },
    bowl: { ends: 3.6, turns: 1.7, short: [1.2, 2.65], acts: [a(0.1, 0.9, 'dog', 'sniffTwice', 'sniffs'), a(1.2, 0.5, 'dog', 'windUp', 'ahh'), a(1.7, 0.5, 'dog', 'sneeze', 'sneeze'), a(1.7, 1.2, 'leaves', 'blowAcross'), a(2.3, 1.2, 'dog', 'rollBack', 'tumble')] },
    line: { ends: 3.6, turns: 0.5, short: [0.5, 1.95], acts: [a(0, 0.4, 'thing', 'pegIn', 'pegClip'), a(0.5, 1.2, 'flags', 'unroll', 'unroll'), a(1.9, 1.7, 'flags', 'flutter', 'flapRustle')] },
  },
  egg: {
    nest: { ends: 3.9, short: [1.1, 2.55], acts: [a(0.1, 0.8, 'goose', 'nudge', 'eggRoll'), a(0.1, 0.8, 'thing', 'rock'), a(1.1, 1.0, 'goose', 'settle', 'wiggle'), a(2.2, 1.6, 'goose', 'coo', 'coo')] },
    pond: { ends: 3.8, short: [1.6, 3.05], acts: [a(0, 0.5, 'thing', 'plop', 'plip'), a(0.6, 0.8, 'thing', 'bob'), a(1.6, 0.5, 'frog', 'poke', 'tap'), a(2.1, 0.5, 'thing', 'duck'), a(2.6, 0.6, 'thing', 'popUp', 'bloop'), a(3.3, 0.5, 'thing', 'bob')] },
    scarecrow: { ends: 3.8, short: [2.2, 3.65], acts: [a(0, 0.4, 'thing', 'layOnHead', 'eggTok'), a(0.1, 0.5, 'scarecrow', 'tall'), a(0.6, 0.6, 'crow', 'flyToHead', 'crowFlap'), a(1.3, 0.8, 'crow', 'sitDown', 'softSettle'), a(2.2, 0.8, 'crow', 'fluffUp', 'fluff'), a(3.1, 0.7, 'crow', 'softCaw', 'softCaw')] },
    bowl: { ends: 4.1, turns: 1.6, short: [0.1, 1.55], acts: [a(0.1, 1.0, 'dog', 'dig', 'scrabble'), a(0.1, 1.0, 'earth', 'fly'), a(1.2, 0.4, 'thing', 'dropIn', 'thud'), a(1.7, 0.8, 'dog', 'noseOver', 'shuffle'), a(2.6, 0.6, 'dog', 'pat', 'pats'), a(3.3, 0.8, 'dog', 'lieOn', 'dogSigh')] },
    line: { ends: 3.7, short: [0.8, 2.25], acts: [a(0, 0.4, 'thing', 'pegIn', 'pegClip'), a(0.9, 0.6, 'goose', 'hopUnder', 'honkHop'), a(1.6, 0.6, 'goose', 'hopUnder', 'honkHopHigher'), a(2.3, 0.6, 'goose', 'hopUnder', 'honkHop'), a(3.0, 0.6, 'goose', 'hopUnder', 'honkHopHigher')] },
  },
}

/** How each place sends its old thing on, as its owner's move and its sound. */
export const SENDS: Record<PlaceId, Act> = {
  nest: a(0, GOES_IN, 'nest', 'tip', 'tipRoll'),
  pond: a(0, GOES_IN, 'frog', 'kick', 'frogKick'),
  bowl: a(0, GOES_IN, 'dog', 'toss', 'tossWhoop'),
  line: a(0, GOES_IN, 'line', 'letSlide', 'slideDown'),
  scarecrow: a(0, GOES_IN, 'crow', 'carryOff', 'carryFlaps'),
}

// --- Who is sent where -------------------------------------------------------

export type Held = Record<PlaceId, ThingId | null>

/** One pairing of a scene: a thing goes into a place and does what it always does there. */
export type Step = {
  thing: ThingId
  place: PlaceId
  /** Where it came from: the raccoon's paws, the place before it in the ring, or the pond the goose landed in. */
  from: 'paws' | PlaceId | 'splash'
  /** The thing that was in the place, sent on as this one goes in. */
  sends: ThingId | null
}

export type Outcome = {
  steps: Step[]
  /**
   * Things set down on the floor beside a place: one that came round to a place that had already taken a
   * newcomer in this round, and one the goose sent out of the pond towards a bowl that had.
   */
  floors: { thing: ThingId; from: PlaceId | 'splash'; beside: PlaceId }[]
  /** The places as the scene leaves them. */
  held: Held
  /** The goose ends in the pond and climbs out: the boot hat. */
  bolts: boolean
}

export function heldOf(at: (id: ThingId) => string): Held {
  const held = Object.fromEntries(PLACE_IDS.map((place) => [place, null])) as Held
  for (const id of THINGS) { const where = at(id); if ((PLACE_IDS as readonly string[]).includes(where)) held[where as PlaceId] = id }
  return held
}

/**
 * What happens when the raccoon puts `thing` into `place`, by the one rule: a place holds one thing, and a
 * newcomer sends the thing that was there on to the next place of the ring, where it does what it always does.
 * A place takes one newcomer in a round: a thing that would come to a place that has had its newcomer is set
 * down on the floor beside it, so a round is at most five pairings. The boot reaching the scarecrow, from the
 * paws or from the line in the middle of a round, sends the goose into the pond, and she is a newcomer there
 * too: whatever is in the pond at that moment goes on to the dog's bowl, after the rest of the round.
 */
export function resolve(before: Held, thing: ThingId, place: PlaceId): Outcome {
  const held: Held = { ...before }
  const steps: Step[] = []
  const floors: Outcome['floors'] = []
  const taken = new Set<PlaceId>()
  let bolts = false
  let splashed: ThingId | null = null
  const chain = (first: ThingId, into: PlaceId, from: Step['from']): void => {
    let going: ThingId | null = first, at = into, source = from
    while (going) {
      if (taken.has(at)) { floors.push({ thing: going, from: source as PlaceId | 'splash', beside: at }); return }
      const old: ThingId | null = held[at]
      held[at] = going
      taken.add(at)
      steps.push({ thing: going, place: at, from: source, sends: old })
      // The boot hat: the goose lands in the pond during this pairing, and what is there leaves it then.
      if (going === 'boot' && at === 'scarecrow' && !bolts) { bolts = true; splashed = held.pond; held.pond = null }
      going = old
      source = at
      at = RING[at]
    }
  }
  chain(thing, place, 'paws')
  if (splashed) chain(splashed, 'bowl', 'splash')
  return { steps, floors, held, bolts }
}

// --- When ---------------------------------------------------------------------

export type Timed = Step & {
  /** Seconds into the scene when the thing starts to go in. */
  at: number
  len: number
  /** The stretch of the cell's own seconds that plays: all of it for a pairing by itself, the short form in a round. */
  w0: number
  w1: number
}

/** A thing on its way from one spot to another while the scene plays. */
export type Travel = { thing: ThingId; from: Step['from']; to: PlaceId | 'floor'; leaves: number; arrives: number }

export type Plan = Outcome & {
  timed: Timed[]
  travels: Travel[]
  /** Every sound of the scene and when it starts, in order. */
  sounds: { t: number; sound: string }[]
  /** When the last thing has come to rest and the goose is back on her round. */
  total: number
  /** Whether a thing was taken to a place that was full: a round, every pairing in its short form. */
  round: boolean
}

/** Seconds into its cell that a scene's second `t` shows, for the pairing that is playing, or null between two. */
export function playing(plan: Plan, t: number): { index: number; step: Timed; u: number; goingIn: number } | null {
  for (let index = plan.timed.length - 1; index >= 0; index--) {
    const step = plan.timed[index]
    if (t < step.at) continue
    if (t >= step.at + step.len && index < plan.timed.length - 1) return null
    const since = t - step.at
    return { index, step, u: Math.min(step.w1, step.w0 + Math.max(0, since - GOES_IN)), goingIn: Math.min(1, since / GOES_IN) }
  }
  return null
}

/** Lays an outcome out in time: each pairing after the one before, each thing sent on travelling until its own pairing starts. */
export function schedule(outcome: Outcome): Plan {
  // A round is a thing taken to a place that is full: by the raccoon, or by the splash of the boot hat, which
  // tips what was in the pond into the dog's bowl. A splash into an empty bowl is no round: the pairing the child
  // made plays in full, and the thing the splash sent on plays its short form after it.
  const first = outcome.steps[0]
  const round = first.sends !== null || outcome.steps.length > 2 || outcome.floors.length > 0
  const timed: Timed[] = []
  const sounds: Plan['sounds'] = []
  const travels: Travel[] = []
  let at = 0
  let gooseLast = false
  outcome.steps.forEach((step) => {
    const cell = GRID[step.thing][step.place]
    const [w0, w1] = round || step !== first ? cell.short : [0, cell.ends]
    const len = GOES_IN + (w1 - w0)
    timed.push({ ...step, at, len, w0, w1 })
    if (step.sends) sounds.push({ t: at, sound: SENDS[step.place].sound! })
    else if (step.from === 'paws') sounds.push({ t: at, sound: 'putIn' })
    for (const act of cell.acts) if (act.sound && act.at >= w0 && act.at < w1) sounds.push({ t: at + GOES_IN + act.at - w0, sound: act.sound })
    gooseLast = cell.acts.some((act) => act.who === 'goose' && act.at + act.len > w0 && act.at < w1)
    at += len
  })
  /** When the goose lands in the pond: the moment what was in it leaves. */
  const divesAt = (): number => {
    const bolt = timed.find((step) => step.thing === 'boot' && step.place === 'scarecrow')!
    const dive = GRID.boot.scarecrow.acts.find((act) => act.does === 'dive')!
    return bolt.at + GOES_IN + Math.max(0, dive.at - bolt.w0)
  }
  for (const step of timed) {
    if (step.from === 'paws') { travels.push({ thing: step.thing, from: 'paws', to: step.place, leaves: 0, arrives: GOES_IN }); continue }
    let leaves = 0
    if (step.from === 'splash') {
      leaves = divesAt()
    } else {
      leaves = timed.find((other) => other.sends === step.thing)!.at
    }
    travels.push({ thing: step.thing, from: step.from, to: step.place, leaves, arrives: step.at + GOES_IN })
  }
  for (const floor of outcome.floors) {
    const leaves = floor.from === 'splash' ? divesAt() : timed.find((other) => other.sends === floor.thing)!.at
    travels.push({ thing: floor.thing, from: floor.from, to: 'floor', leaves, arrives: at })
    sounds.push({ t: at, sound: `land:${floor.thing}` })
  }
  // Two things that end on the floor land together; and a goose that had the last word goes back to her round.
  if (outcome.floors.length || gooseLast) {
    // She goes back to her round.
    at += 0.5
  }
  sounds.sort((x, y) => x.t - y.t)
  return { ...outcome, timed, travels, sounds, total: at, round }
}

/** Every name of a sound the grid uses, once each, for the voices and their test. */
export function soundNames(): string[] {
  const names = new Set<string>(['putIn'])
  for (const place of PLACE_IDS) names.add(SENDS[place].sound!)
  for (const thing of THINGS) for (const place of PLACE_IDS) for (const act of GRID[thing][place].acts) if (act.sound) names.add(act.sound)
  return [...names]
}
