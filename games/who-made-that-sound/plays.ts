import { BREATH, choir, finding, knockRight, knockWrong, meeting, reunion, round, showing, type Cue } from './beats'
import { ENTRANCE_SECONDS, WEIGHT } from './motion'
import { ASKING_EGG, STONE_FEET, nestOf, pictureOf, slotSpot, waitersOf, type Picture, type Spot, type Thing } from './picture'
import { placeOf } from './places'
import { WIDE } from './figures'
import { RIDER, askerSize, edgeSize, hillSize, littleSize, rowSize, twinApart, twinSize } from './sizes'
import { brush, burst, crack, flick, gasp, knock, plop, rustle, swish, thump, tick, type Puff } from './sounds'
import { EDGE_PEEK, EGG, FLOOR, HILL_SPOTS, eggSpots, type Rect } from './stage'
import { IN_STEP_TAIL } from './reactions'
import type { Reaction } from './tastes'
import { type Kind, type Note, RUSTLE, VOICES, callOf, callSeconds } from './voices'
import { type Action, type Happening, type Resident, type World, singsRound } from './world'

// What a tap looks and sounds like, as plain data: who is on stage, what each
// does when, and what is heard. The model (world.ts) has already changed when
// a play starts, so a play is only the way from the picture before the tap to
// the picture after it (picture.ts): it ends with everyone standing exactly
// where the saved world has them, a touch can end it at any moment, and
// nothing in it is saved. The scenes take their timing from beats.ts.
// No renderer and no sound here: show.ts runs a play on the template's
// scene.ts, view.ts draws it and the Mount sounds it.

export type Body = 'grown' | 'little' | 'egg' | 'pile' | 'family' | 'twins' | 'nest' | 'bowl'

/** Someone or something that is on stage only while the play runs. */
export type Cast = { id: string; body: Body; kind: Kind; from: Spot; /** On stage from the start; otherwise from its first act. */ shown: boolean; /** Wings out to the row, as one who asks. */ asks?: boolean; /** It has just come out of an egg: a piece of shell still sits on its head. */ hatched?: boolean; /** How many eggs a nest holds as the play starts. */ eggs?: number; /** The cast member it rides on whenever it sits on its head: it then moves as that one moves. */ rides?: string }

/** One thing one actor does. `who` is a cast id, or the key of a thing of the picture after the tap. */
export type Act = { at: number; lasts: number; who: string } & (
  | { do: 'enter' }
  | { do: 'call'; kind: Kind; inside: boolean }
  /** By its taste, or in step with the other of a pair. `much` is how big an in-step move is, 1 if it is not given. */
  | { do: 'react'; kind: Kind; how: Reaction; away: 1 | -1; much?: number }
  | { do: 'go'; to: Spot; hops: number }
  /** Through the air, tumbling: an egg out of a nest or a basket. */
  | { do: 'fly'; to: Spot }
  /** Straight there, no hops: in from the edge, or off over it. */
  | { do: 'slide'; to: Spot }
  /** Along the ground, turning as it goes: an egg rolls to the stone. */
  | { do: 'roll'; to: Spot }
  /** A tap or a knock: a lunge to that side and back. */
  | { do: 'lunge'; towards: 1 | -1 }
  /** A hide's lid lifts. */
  | { do: 'wake' }
  /** A hide bursts: its shell or its leaves fly off, and it is gone. */
  | { do: 'burst' }
  /** Turns to the front with a small hop: the choir gathers. */
  | { do: 'face' }
  /** Goes up and is gone: someone makes way on the hill, an empty bowl is taken off the page. */
  | { do: 'fade' }
  /** A thing of the picture comes into view from beyond the edge; until then it is off the page. */
  | { do: 'arrive' }
  /** Out of breath: one huge gulp of air. */
  | { do: 'gulp' }
  /** Sinks where it stands and is gone: an egg under the leaves that fall over it. */
  | { do: 'sink' }
)

/** A call, or with `note` only that one of its notes; or a sound that is not a voice. */
export type Sounded = { at: number; call: { kind: Kind; inside: boolean; note?: number } } | { at: number; puffs: Puff[] }

/** The notes a call sounds: the whole call of the kind, or the one note of it that is asked for. */
export function notesOf(call: { kind: Kind; inside: boolean; note?: number }): Note[] {
  const notes = callOf(call.kind, call.inside), one = call.note === undefined ? undefined : notes[call.note]
  return one ? [{ ...one, at: 0 }] : notes
}

export type Play = { cast: Cast[]; acts: Act[]; sounds: Sounded[]; /** Things of the picture after the tap that are not drawn while the play runs: the play shows them on their way. */ hidden: string[]; seconds: number }

/** The one inside calls this long after the finger lands, when the knock and the crack are over. */
export const WAKE_CALL = 0.06
export const TIP_GAP = 0.16
export const TIP_FLY = 0.5
/** How far above an egg the leaves that cover it start, and how long they take to come down. */
export const LEAF_FALL = 190
export const LEAVES_FALL = 0.4
/** A grown one's walk from the edge to the stone, and a little one's from its shell to the stone. */
const WALK = 0.9
/** An egg's roll from the edge onto the stone. */
const ROLL = 0.8

const voice = (kind: Kind) => callSeconds(VOICES[kind])
/** How long the longest of the six voices lasts. */
export const LONGEST_VOICE = Math.max(...Object.values(VOICES).map(callSeconds))
const soft = (puffs: Puff[], by: number): Puff[] => puffs.map((one) => ({ ...one, peak: Math.max(0.02, one.peak * by) }))
const hopsOf = (kind: Kind) => (WEIGHT[kind] < 0.34 ? 4 : WEIGHT[kind] < 0.67 ? 3 : 2)
const hillFeet = (place: number) => ({ x: HILL_SPOTS[place].x + HILL_SPOTS[place].w / 2, y: HILL_SPOTS[place].y + HILL_SPOTS[place].h })

/** Where the little one of a family rides, given where the grown one stands. */
export const riderOn = (grown: Spot): Spot => ({ x: grown.x, y: grown.y - grown.size * RIDER.up, size: grown.size * RIDER.size })
/** Where the two of a family stand in a place on the hill, and the two of twins, and one alone. */
export const familyAt = (kind: Kind, place: number): Spot => ({ ...hillFeet(place), size: hillSize(kind) })
export const twinAt = (kind: Kind, place: number, side: 1 | -1): Spot => ({ x: hillFeet(place).x + side * twinApart(kind), y: hillFeet(place).y, size: twinSize(kind) })
export const aloneAt = (kind: Kind, place: number): Spot => ({ ...hillFeet(place), size: littleSize(kind) })
/** Where each one of whoever stands in a place on the hill has its feet: the two of a family, the two twins, or one alone. */
export function hillSpots(kind: Kind, as: Resident['as'], place: number): Spot[] {
  return as === 'family' ? [familyAt(kind, place), riderOn(familyAt(kind, place))] : as === 'twins' ? [twinAt(kind, place, 1), twinAt(kind, place, -1)] : [aloneAt(kind, place)]
}
const sameSpot = (a: Spot, b: Spot) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5

/**
 * The place on the hill a cast member of a play is on its way to: where it stands when the play is over, if that
 * is where someone of `hill` stands. Null for anyone who goes elsewhere or leaves.
 */
export function boundFor(play: Play, id: string, hill: readonly Resident[]): number | null {
  const cast = play.cast.find((one) => one.id === id)
  if (!cast || (cast.body !== 'grown' && cast.body !== 'little') || play.acts.some((one) => one.who === id && (one.do === 'burst' || one.do === 'fade' || one.do === 'sink'))) return null
  const end = finalSpot(play, id)!
  return hill.find((one) => one.kind === cast.kind && hillSpots(one.kind, one.as, one.place).some((spot) => sameSpot(spot, end)))?.place ?? null
}

/**
 * Where the one who comes out of a hide lands: beside the one who asks, a little in front of the stone, so
 * that the two stand next to each other when they are heard one after the other.
 */
export const besideStone = (kind: Kind): Spot => {
  // And clear of the first hide of a full row, so that it never stands on a hide's place.
  const hide = eggSpots(4)[0], half = (WIDE[kind] * littleSize(kind)) / 2
  return { x: Math.min(STONE_FEET.x + 122, hide.x - 10 - half), y: FLOOR + 40, size: littleSize(kind) }
}

/** Just off the page, beyond its right edge. */
const offPage = (view: Rect, size: number): Spot => ({ x: view.x + view.w + 190, y: FLOOR, size })

class Stage {
  cast: Cast[] = []
  acts: Act[] = []
  sounds: Sounded[] = []
  hidden = new Set<string>()
  /** Where the play has got to: the next thing starts here. */
  t = 0

  constructor(readonly before: Picture, readonly after: Picture, readonly way: number) {}

  add(id: string, body: Body, kind: Kind, from: Spot, shown: boolean, more: Partial<Cast> = {}) {
    this.cast.push({ id, body, kind, from, shown, ...more })
  }
  hide(...keys: string[]) { for (const key of keys) this.hidden.add(key) }
  noise(at: number, puffs: Puff[]) { this.sounds.push({ at, puffs }) }
  call(who: string, kind: Kind, inside: boolean, at = this.t): number {
    // A leaf pile rustles the same way whoever calls from it, and as long, and whatever comes next waits as long
    // as the longest voice would take: there the eye learns nothing of the voice, not even from a pause.
    const pile = inside && this.after.leaves && who.startsWith('slot:')
    this.acts.push({ at, lasts: pile ? RUSTLE.seconds : voice(kind), who, do: 'call', kind, inside })
    this.sounds.push({ at, call: { kind, inside } })
    // The rustle is heard as well as seen: the same soft rustle of leaves under every voice.
    if (pile) this.noise(at, soft(rustle(), 0.5))
    return at + (pile ? LONGEST_VOICE : voice(kind))
  }
  /** Where a cast member stands after everything it has been told to do so far. */
  spotOf(who: string): Spot {
    let spot = this.cast.find((one) => one.id === who)!.from, last = -1
    for (const act of this.acts) if (act.who === who && (act.do === 'go' || act.do === 'fly' || act.do === 'slide' || act.do === 'roll') && act.at >= last) { spot = act.to; last = act.at }
    return spot
  }
  /**
   * Two of a kind sound as one: both call, and each does its kind's own picture of that towards the other
   * (reactions.ts, and the second column of the grid in ART.md), for the call and a little longer.
   */
  asOne(a: string, b: string, kind: Kind, at: number) {
    const lasts = voice(kind) + IN_STEP_TAIL, left = this.spotOf(a).x <= this.spotOf(b).x ? a : b
    for (const who of [a, b]) {
      this.call(who, kind, false, at)
      this.acts.push({ at, lasts, who, do: 'react', kind, how: 'in-step', away: who === left ? -1 : 1 })
    }
  }
  /**
   * A pair of `wheep` bounces on every glide: on each call heard before the two sound as one, lower than on the
   * next, so that the bounce with both voices is the highest. The other kinds keep still and listen.
   */
  bounces(a: string, b: string, kind: Kind, glides: number[]) {
    if (kind !== 'wheep') return
    const left = this.spotOf(a).x <= this.spotOf(b).x ? a : b
    glides.forEach((at, i) => {
      for (const who of [a, b]) this.acts.push({ at, lasts: voice(kind) + BREATH, who, do: 'react', kind, how: 'in-step', away: who === left ? -1 : 1, much: (i + 1) / (glides.length + 1) })
    })
  }
  /** Out of its hide and over to `to`, in the time its way out takes: one leap, heard as it lands. */
  leap(who: string, kind: Kind, at: number, lasts: number, to: Spot = besideStone(kind)) {
    this.acts.push({ at, lasts, who, do: 'enter' }, { at, lasts, who, do: 'go', to, hops: 1 })
    this.noise(at + lasts, soft(thump(WEIGHT[kind]), 0.7))
  }
  /** A walk in hops, each landing heard, the last one hardest. */
  go(who: string, kind: Kind, to: Spot, at: number, lasts: number, hops = hopsOf(kind)) {
    this.acts.push({ at, lasts, who, do: 'go', to, hops })
    for (let hop = 1; hop <= hops; hop++) this.noise(at + (lasts * hop) / hops, hop === hops ? thump(WEIGHT[kind]) : soft(thump(WEIGHT[kind]), 0.5))
  }
  thing(key: string): Thing | undefined { return this.after.things.find((one) => one.key === key) }
  was(key: string): Thing | undefined { return this.before.things.find((one) => one.key === key) }

  /** Whoever waits at the edge after the tap comes into view, and with it a basket that has a new egg. */
  nextAppears(at: number, lasts = 0.6) {
    if (this.thing('edge')) this.acts.push({ at, lasts, who: 'edge', do: 'arrive' })
    if (this.thing('basket') && !this.was('basket')) this.acts.push({ at, lasts, who: 'basket', do: 'arrive' })
    this.t = Math.max(this.t, at + lasts)
  }

  done(): Play {
    const seconds = Math.max(this.t, ...this.acts.map((act) => act.at + act.lasts), 0)
    return { cast: this.cast, acts: this.acts.sort((a, b) => a.at - b.at), sounds: this.sounds.sort((a, b) => a.at - b.at), hidden: [...this.hidden], seconds }
  }
}

/**
 * Where the one who comes out lands when its own kind asks: beside the other, and `pip`, who shoots out like a
 * cork, on the other's head (the second column of the grid in ART.md).
 */
const landsBy = (kind: Kind, other: Spot): Spot | undefined => (kind === 'pip' ? riderOn(other) : undefined)

/** A hide of the row bursts: its shell flies, and the one inside is on stage where it stood. `rides` is the one whose head it may come to sit on. */
function letOut(stage: Stage, slot: number, kind: Kind, row: number, at: number, rides?: string) {
  const from = { ...slotSpot(slot, row), size: littleSize(kind) }
  stage.add('shell', stage.before.leaves ? 'pile' : 'egg', kind, { ...slotSpot(slot, row), size: EGG.h }, true)
  stage.acts.push({ at, lasts: 0.9, who: 'shell', do: 'burst' })
  stage.noise(at, burst(stage.way))
  stage.add('out', 'little', kind, from, false, { rides })
  return from
}

/** Everything up the hill together: the two of a family, or two little ones side by side. */
function goUp(stage: Stage, resident: Resident, grown: string | null, little: string, other: string | null, at: number, lasts: number) {
  const { kind, place } = resident
  stage.hide(`hill:${place}`)
  if (resident.as === 'family' && grown) {
    stage.go(grown, kind, familyAt(kind, place), at, lasts)
    stage.acts.push({ at, lasts, who: little, do: 'go', to: riderOn(familyAt(kind, place)), hops: hopsOf(kind) })
  } else if (resident.as === 'twins' && other) {
    stage.go(little, kind, twinAt(kind, place, 1), at, lasts)
    stage.acts.push({ at, lasts, who: other, do: 'go', to: twinAt(kind, place, -1), hops: hopsOf(kind) })
  } else stage.go(little, kind, aloneAt(kind, place), at, lasts)
}

const cueAt = (cues: Cue[], at: number) => cues.map((cue) => ({ ...cue, at: cue.at + at }))

/** The reunion in `seek` and `alike`: the hide of the kind that asks is opened. */
function playReunion(stage: Stage, slot: number, kind: Kind, resident: Resident, row: number) {
  const [enters, first, second, together, joins, up] = cueAt(reunion(kind), stage.t), little = resident.as === 'twins'
  const asker: Spot = { ...STONE_FEET, size: little ? littleSize(kind) : askerSize(kind) }
  // The one who asks is laid down first, so that whoever lands on its head is in front of it.
  stage.add('seeker', little ? 'little' : 'grown', kind, asker, true, { asks: true })
  letOut(stage, slot, kind, row, enters.at, 'seeker')
  stage.leap('out', kind, enters.at, enters.lasts, landsBy(kind, asker))
  stage.call('out', kind, false, first.at)
  stage.call('seeker', kind, false, second.at)
  stage.bounces('out', 'seeker', kind, [first.at, second.at])
  stage.asOne('out', 'seeker', kind, together.at)
  // The little one climbs on; two little ones come to stand side by side.
  stage.go('out', kind, little ? { x: asker.x + 96, y: asker.y, size: asker.size } : riderOn(asker), joins.at, joins.lasts, 2)
  goUp(stage, resident, 'seeker', 'out', 'seeker', up.at, up.lasts)
  stage.t = up.at + up.lasts
}

/** The meeting that does not match in `seek` and `alike`: another hide is opened, and the two react by their tastes. */
function playMeeting(stage: Stage, slot: number, asker: Kind, other: Kind, resident: Resident, row: number) {
  const [enters, first, second, mine, theirs, up] = cueAt(meeting(asker, other), stage.t)
  letOut(stage, slot, other, row, enters.at)
  stage.leap('out', other, enters.at, enters.lasts)
  stage.call('out', other, false, first.at)
  stage.call('asker', asker, false, second.at)
  if (mine.cue === 'reacts') stage.acts.push({ at: mine.at, lasts: mine.lasts, who: 'asker', do: 'react', kind: asker, how: mine.how, away: -1 })
  if (theirs.cue === 'reacts') stage.acts.push({ at: theirs.at, lasts: theirs.lasts, who: 'out', do: 'react', kind: other, how: theirs.how, away: 1 })
  // It goes up alone, or to the other of its kind who stood there alone.
  if (resident.as === 'twins') stage.add('alone', 'little', other, aloneAt(other, resident.place), true)
  goUp(stage, resident, null, 'out', 'alone', up.at, up.lasts)
  stage.t = up.at + up.lasts
}

/** How far in front of the row a grown one stands once it has been heard, ready to be sent (view.ts). */
export const HEARD_STEP = 30
/** How long the one who shows takes to set its egg down. */
export const SET_DOWN = 0.2
/** How far a tap or a knock lunges, in body heights (view.ts). */
export const LUNGE = 0.2
/**
 * Where someone `size` tall stands to tap a hide, on its left (-1) or its right (1): with a small gap between
 * the two, less than half of what the lunge of a tap covers, so that the tap lands on the hide.
 */
export const tapsFrom = (kind: Kind, hide: Spot, size: number, side: 1 | -1): Spot => ({ x: hide.x + side * (((EGG.w / EGG.h) * hide.size) / 2 + (WIDE[kind] * size) / 2 + size * LUNGE * 0.4), y: hide.y, size })

/**
 * Where a grown one of the row stands to knock on the egg at the stone: beside the egg, and clear of the first
 * spot of the row with a little page between, so that no piece of it lies across whoever stands there. A wide
 * one then leans on the egg it knocks on.
 */
export const knockSpot = (kind: Kind, row: number): Spot => {
  const size = rowSize(kind, row), half = (WIDE[kind] * size) / 2, widest = (row >= 4 ? 126 : 150) / 2
  return { x: Math.min(STONE_FEET.x + 150, slotSpot(0, row).x - widest - 6 - half), y: STONE_FEET.y, size }
}

/** In `who`: a grown one walks over and knocks. Its own egg opens; another answers and stays shut. */
function playKnock(stage: Stage, slot: number, egg: Kind, grown: Kind, resident: Resident | null, row: number) {
  const home: Spot = { ...slotSpot(slot, row), size: rowSize(grown, row) }, at = stage.t
  // It has been heard, so it stood a step in front of the row: it sets off from there.
  stage.add('grown', 'grown', grown, { ...home, y: home.y + HEARD_STEP }, true)
  stage.hide(`slot:${slot}`)
  if (!resident) {
    const [over, taps, answer, mine, reacts, back] = cueAt(knockWrong(egg, grown), at)
    stage.go('grown', grown, knockSpot(grown, row), over.at, over.lasts, 2)
    stage.acts.push({ at: taps.at, lasts: taps.lasts, who: 'grown', do: 'lunge', towards: -1 })
    stage.noise(taps.at + 0.1, knock(0.5))
    stage.call('asker', egg, true, answer.at)
    stage.call('grown', grown, false, mine.at)
    if (reacts.cue === 'reacts') stage.acts.push({ at: reacts.at, lasts: reacts.lasts, who: 'grown', do: 'react', kind: grown, how: reacts.how, away: 1 })
    stage.go('grown', grown, home, back.at, back.lasts, 2)
    stage.t = back.at + back.lasts
    return
  }
  const [over, taps, enters, first, second, together, joins, up] = cueAt(knockRight(grown), at), stone: Spot = { ...STONE_FEET, size: EGG.h * ASKING_EGG }
  stage.add('shell', 'egg', egg, stone, true)
  stage.add('out', 'little', grown, { ...STONE_FEET, size: littleSize(grown) }, false, { rides: 'grown' })
  stage.go('grown', grown, knockSpot(grown, row), over.at, over.lasts, 2)
  stage.acts.push({ at: taps.at, lasts: taps.lasts, who: 'grown', do: 'lunge', towards: -1 })
  stage.noise(taps.at + 0.1, knock(0.5))
  stage.acts.push({ at: enters.at, lasts: 0.9, who: 'shell', do: 'burst' })
  stage.noise(enters.at, burst(stage.way))
  // It comes out where its egg stood, beside the grown one who knocked; `pip` lands on that one's head.
  const onto = landsBy(grown, knockSpot(grown, row))
  if (onto) stage.leap('out', grown, enters.at, enters.lasts, onto)
  else stage.acts.push({ at: enters.at, lasts: enters.lasts, who: 'out', do: 'enter' })
  stage.call('out', grown, false, first.at)
  stage.call('grown', grown, false, second.at)
  stage.bounces('out', 'grown', grown, [first.at, second.at])
  stage.asOne('out', 'grown', grown, together.at)
  stage.go('out', grown, riderOn(knockSpot(grown, row)), joins.at, joins.lasts, 2)
  goUp(stage, resident, 'grown', 'out', null, up.at, up.lasts)
  stage.t = up.at + up.lasts
}

/** The finding on the hill: `comer` (already on stage) and the one who waited alone call, sound as one, and stand together. */
function playFinding(stage: Stage, comer: string, kind: Kind, resident: Resident) {
  const [first, second, together, up, joins] = cueAt(finding(kind), stage.t), family = resident.as === 'family'
  stage.add('alone', 'little', kind, aloneAt(kind, resident.place), true, { rides: comer })
  stage.hide(`hill:${resident.place}`)
  stage.call(comer, kind, false, first.at)
  stage.call('alone', kind, false, second.at)
  stage.asOne(comer, 'alone', kind, together.at)
  stage.go(comer, kind, family ? familyAt(kind, resident.place) : twinAt(kind, resident.place, 1), up.at, up.lasts)
  stage.go('alone', kind, family ? riderOn(familyAt(kind, resident.place)) : twinAt(kind, resident.place, -1), joins.at, joins.lasts, 1)
  stage.t = joins.at + joins.lasts
}

/** The showing: a pair of a kind that is not in the clutch does once what the child will do. */
function playShowing(stage: Stage, form: 'seek' | 'who' | 'alike', kind: Kind, resident: Resident, row: number) {
  const cues = cueAt(showing(form, kind), stage.t), view = stage.after.view
  // The single egg is set down on the first spot of the row that is about to come in; in `who` it is at the stone.
  const egg: Spot = form === 'who' ? { ...STONE_FEET, size: EGG.h * ASKING_EGG } : { ...slotSpot(0, row), size: EGG.h }
  // The one who shows walks over to it and stands so near that each tap reaches it: on the side of the stone, or
  // in `who`, where the egg is on the stone, on the side of the row. In `alike` it is a little one that has just
  // come out, with a piece of its shell still on its head.
  const tapper = tapsFrom(kind, egg, form === 'who' ? rowSize(kind, 3) : form === 'alike' ? littleSize(kind) : askerSize(kind), form === 'who' ? 1 : -1)
  stage.add('shower', form === 'alike' ? 'little' : 'grown', kind, { x: view.x + view.w - EDGE_PEEK, y: FLOOR, size: tapper.size }, true, { hatched: form === 'alike' })
  // The egg comes in on the head of the one who shows, as a nest does, and is set down when the two have arrived:
  // until its own first act it is drawn where its carrier's head is (view.ts).
  stage.add('shown', 'egg', kind, { ...riderOn(tapper), size: egg.size * 0.6 }, false, { rides: 'shower' })
  stage.add('out', 'little', kind, { x: egg.x, y: egg.y, size: littleSize(kind) }, false, { rides: 'shower' })
  let taps = 0, calls = 0
  for (const cue of cues) {
    if ((cue.cue === 'enters' || cue.cue === 'crosses') && calls === 0) {
      stage.go('shower', kind, tapper, cue.at, cue.lasts, 2)
      stage.acts.push({ at: cue.at + cue.lasts, lasts: SET_DOWN, who: 'shown', do: 'slide', to: egg })
      stage.noise(cue.at + cue.lasts + SET_DOWN, plop(0))
    } else if (cue.cue === 'calls') { stage.call(cue.inside ? 'shown' : 'shower', kind, cue.inside, cue.at); calls++ }
    else if (cue.cue === 'taps') {
      stage.acts.push({ at: cue.at, lasts: cue.lasts, who: 'shower', do: 'lunge', towards: form === 'who' ? -1 : 1 })
      if (taps++ === 0) { stage.acts.push({ at: cue.at + 0.12, lasts: 0.3, who: 'shown', do: 'wake' }); stage.noise(cue.at + 0.12, [...knock(0.5), ...crack(stage.way).map((one) => ({ ...one, at: one.at + 0.012 }))]) }
      else { stage.acts.push({ at: cue.at + 0.12, lasts: 0.9, who: 'shown', do: 'burst' }); stage.noise(cue.at + 0.12, burst(stage.way)) }
    } else if (cue.cue === 'enters') stage.acts.push({ at: cue.at, lasts: cue.lasts, who: 'out', do: 'enter' })
    else if (cue.cue === 'together') {
      stage.asOne('shower', 'out', kind, cue.at)
    }
    else if (cue.cue === 'goesUp') { goUp(stage, resident, 'shower', 'out', 'shower', cue.at, cue.lasts); stage.t = cue.at + cue.lasts }
  }
}

/** A clutch comes into the row: eggs tumble out of the nest, or in `who` the grown ones walk in. */
function playArrival(stage: Stage, world: World) {
  const cycle = world.cycle!, row = cycle.kinds.length, view = stage.after.view, at = stage.t, leaves = placeOf(cycle.place).leaves
  // The nest is where it waited: on the head of the one who brought it, or on the ground.
  const edge = stage.was('edge'), nest = nestOf(view, cycle.form, edge?.key === 'edge' ? edge.kind : null, edge?.key === 'edge' && edge.roomy)
  const from: Spot = { x: nest.x, y: nest.y, size: EGG.h * 0.6 }
  stage.add('nest', 'nest', cycle.kinds[0], { ...from, size: EGG.h * nest.size }, true, { eggs: cycle.form === 'who' ? 1 : row })
  // In `who` the grown ones who waited around the nest stay where they stood until each sets off for its spot.
  const waiters = edge?.key === 'edge' && cycle.form === 'who' ? waitersOf(edge, stage.before.view) : []
  cycle.kinds.forEach((kind, slot) => {
    stage.hide(`slot:${slot}`)
    if (cycle.form === 'who') {
      const stood = waiters[slot]
      stage.add(`in:${slot}`, 'grown', kind, stood ? { x: stood.x, y: stood.y, size: stood.size } : { x: view.x + view.w - EDGE_PEEK, y: FLOOR, size: rowSize(kind, row) }, stood !== undefined)
      stage.go(`in:${slot}`, kind, { ...slotSpot(slot, row), size: rowSize(kind, row) }, at + slot * 0.22, WALK, 3)
    } else {
      // What is in a nest is eggs, and eggs tumble out of it. In a leaf place leaves fall over each one as it
      // lands, as over an egg tipped from the basket, and it is a heap like the others.
      const to: Spot = { ...slotSpot(slot, row), size: EGG.h }, lands = at + slot * TIP_GAP + TIP_FLY
      stage.add(`in:${slot}`, 'egg', kind, from, false)
      stage.acts.push({ at: at + slot * TIP_GAP, lasts: TIP_FLY, who: `in:${slot}`, do: 'fly', to })
      stage.noise(lands, plop(slot))
      if (leaves) {
        stage.add(`leaves:${slot}`, 'pile', kind, { ...to, y: to.y - LEAF_FALL }, false)
        stage.acts.push({ at: lands, lasts: LEAVES_FALL, who: `leaves:${slot}`, do: 'slide', to }, { at: lands, lasts: LEAVES_FALL, who: `in:${slot}`, do: 'sink' })
        stage.noise(lands + LEAVES_FALL * 0.6, soft(rustle(), 0.7))
      }
    }
  })
  stage.noise(at, rustle())
  stage.t = at + (cycle.form === 'who' ? (row - 1) * 0.22 + WALK : (row - 1) * TIP_GAP + TIP_FLY + (leaves ? LEAVES_FALL : 0))
  // The nest leaves when it is empty: in `who` when its one egg has rolled to the stone.
  stage.acts.push({ at: stage.t + (cycle.form === 'who' ? 0.7 : 0.1), lasts: 0.6, who: 'nest', do: 'slide', to: { ...offPage(view, EGG.h * nest.size), y: nest.y } })
}

/** The next one comes to the stone and calls. Returns its cast id, in case it finds its own on the hill at once. */
function playAsks(stage: Stage, kind: Kind, form: 'seek' | 'who' | 'alike', calls: boolean): string {
  const view = stage.after.view, at = stage.t
  stage.hide('asker')
  if (form === 'who') {
    stage.add('comer', 'egg', kind, { x: view.x + view.w - 60, y: FLOOR, size: EGG.h * 0.6 }, true)
    // An egg that waited at the edge inside a cycle sat in a small nest of its own: the nest stays as the egg
    // rolls out of it, and then goes off over the edge.
    const waited = stage.was('edge')
    if (waited?.key === 'edge' && waited.what === 'egg') {
      stage.add('cup', 'nest', kind, { x: waited.x, y: waited.y, size: EGG.h * 0.62 }, true, { eggs: 0 })
      stage.acts.push({ at: at + 0.3, lasts: 0.5, who: 'cup', do: 'slide', to: { ...offPage(view, EGG.h * 0.62), y: waited.y } })
    }
    // The egg rolls onto the stone from the edge, along the ground.
    stage.acts.push({ at, lasts: ROLL, who: 'comer', do: 'roll', to: { ...STONE_FEET, size: EGG.h * ASKING_EGG } })
    stage.noise(at, soft(rustle(), 0.6))
    stage.noise(at + ROLL, plop(0))
    stage.t = at + ROLL + BREATH
    if (calls) stage.t = stage.call('comer', kind, true)
  } else {
    // It sets off from where it waited: at the edge, or with a clutch from where it stood with the nest on its head.
    const waited = stage.was('edge'), stood = waited?.key === 'edge' && waited.what === 'clutch' ? waitersOf(waited, stage.before.view)[0] : undefined
    stage.add('comer', 'grown', kind, stood ? { x: stood.x, y: stood.y, size: stood.size } : { x: view.x + view.w - EDGE_PEEK, y: FLOOR, size: edgeSize(kind) }, true, { asks: true })
    stage.go('comer', kind, { ...STONE_FEET, size: askerSize(kind) }, at, WALK, 3)
    stage.t = at + WALK + BREATH
    if (calls) stage.t = stage.call('comer', kind, false)
  }
  return 'comer'
}

/** The choir: everyone who came out of this clutch, in the order they came to stand on the hill, and then who waits next. */
function playChoir(stage: Stage, found: readonly Kind[], world: World) {
  // Whoever of a kind sings: the ones in its place on the hill, or, where the scene before the choir is still
  // showing them on their way there (the last one found), those of its cast who have just arrived.
  const soFar: Play = { cast: stage.cast, acts: [...stage.acts].sort((a, b) => a.at - b.at), sounds: [], hidden: [], seconds: 0 }
  const cues = cueAt(choir(found), stage.t), singers = (kind: Kind): string[] => {
    const place = world.hill.find((one) => one.kind === kind)?.place ?? 0, key = `hill:${place}`
    if (!stage.hidden.has(key)) return [key]
    const arrived = stage.cast.filter((one) => boundFor(soFar, one.id, world.hill) === place).map((one) => one.id)
    return arrived.length > 0 ? arrived : [key]
  }
  // One voice for each kind, and the picture of it on everyone who sings it.
  const sing = (kind: Kind, at: number) => singers(kind).forEach((who, i) => { if (i === 0) stage.call(who, kind, false, at); else stage.acts.push({ at, lasts: voice(kind), who, do: 'call', kind, inside: false }) })
  for (const cue of cues) {
    if (cue.cue === 'gathers') for (const kind of cue.who) for (const who of singers(kind)) stage.acts.push({ at: cue.at, lasts: cue.lasts, who, do: 'face' })
    else if (cue.cue === 'calls') sing(cue.who, cue.at)
    else if (cue.cue === 'together') for (const kind of cue.who) sing(kind, cue.at)
    else if (cue.cue === 'nextAppears') stage.nextAppears(cue.at, cue.lasts)
  }
}

/**
 * The play for one tap: what `happened`, on the way from the world before it to the world after it. Null when
 * the tap set nothing going that a play shows (a tap on someone on the hill, or on nothing: the show answers
 * those by itself).
 */
export function direct(happened: readonly Happening[], action: Action, before: World, after: World, view: Rect, way: number): Play | null {
  const stage = new Stage(pictureOf(before, view), pictureOf(after, view), way), form = after.cycle?.form ?? 'seek'
  const row = Math.max(before.cycle?.kinds.length ?? 0, 1), slot = action.type === 'slot' ? action.slot : 0
  // Whoever makes way on the hill does so at once, so those come first; and the showing comes before the clutch it belongs to.
  const order = [...happened.filter((one) => one.type === 'leaves'), ...happened.filter((one) => one.type !== 'leaves')]
  const shows = order.findIndex((one) => one.type === 'shows'), arrives = order.findIndex((one) => one.type === 'arrives')
  if (shows > arrives && arrives >= 0) order.splice(arrives, 0, ...order.splice(shows, 2))
  let comer: string | null = null
  // The finger on the shell, the shell giving, and then the one inside; every hide knocks alike, whoever is in it.
  const who = form === 'who'
  const hideCalls = (one: Extract<Happening, { type: 'hears' }>) => {
    if (!who) stage.noise(stage.t, [...knock(0.5), ...(stage.after.leaves ? [] : crack(way).map((puff) => ({ ...puff, at: puff.at + 0.012 })))])
    stage.t = stage.call(`slot:${one.slot}`, one.kind, !who, stage.t + (who ? 0.03 : WAKE_CALL)) + BREATH
  }
  // A hide tapped while nobody is at the stone brings the next one in as well. The hide answers the finger first,
  // as it lands; the one who comes in calls when it has reached the stone, and that call is the answer to it.
  const first = order.find((one): one is Extract<Happening, { type: 'hears' }> => one.type === 'hears')
  const hideFirst = first !== undefined && order.some((one) => one.type === 'asks')
  if (hideFirst) hideCalls(first)
  for (let i = 0; i < order.length; i++) {
    const one = order[i], next = order[i + 1]
    if (one.type === 'shows' && next?.type === 'settles') { playShowing(stage, one.form, one.kind, next.resident, after.cycle?.kinds.length ?? 3); i++ }
    else if (one.type === 'arrives') playArrival(stage, after)
    else if (one.type === 'asks') {
      const finds = next?.type === 'settles' && order[i + 2]?.type === 'finds'
      comer = playAsks(stage, one.kind, form, !finds)
      if (finds && next?.type === 'settles') { playFinding(stage, comer, one.kind, next.resident); i += 2 }
      // Whoever waits next comes into view at the edge once the one who came has left it.
      stage.nextAppears(stage.t - 0.4)
    } else if (one.type === 'hears') {
      if (hideFirst) continue
      hideCalls(one)
      if (one.asker !== null) stage.t = stage.call(comer ?? 'asker', one.asker, who)
    } else if (one.type === 'meets') {
      const settles = next?.type === 'settles' ? next.resident : null
      if (form === 'who') playKnock(stage, one.slot, one.meeting.asker, one.meeting.other, settles, row)
      else if (one.meeting.match && settles) playReunion(stage, one.slot, one.meeting.other, settles, row)
      else if (settles) playMeeting(stage, one.slot, one.meeting.asker, one.meeting.other, settles, row)
      if (settles) i++
    } else if (one.type === 'stepsOut') {
      letOut(stage, one.slot, one.kind, row, stage.t)
      stage.hide('asker')
      stage.acts.push({ at: stage.t, lasts: ENTRANCE_SECONDS[one.kind], who: 'out', do: 'enter' })
      stage.t = stage.call('out', one.kind, false, stage.t + ENTRANCE_SECONDS[one.kind]) + BREATH
      stage.go('out', one.kind, { ...STONE_FEET, size: littleSize(one.kind) }, stage.t, WALK * 0.8, 2)
      stage.t += WALK * 0.8
    } else if (one.type === 'settles' && next?.type === 'finds') {
      // In `alike`, with nobody asking: the second of a kind is let out and finds the first on the hill.
      letOut(stage, slot, one.resident.kind, row, stage.t)
      stage.acts.push({ at: stage.t, lasts: ENTRANCE_SECONDS[one.resident.kind], who: 'out', do: 'enter' })
      stage.t += ENTRANCE_SECONDS[one.resident.kind]
      playFinding(stage, 'out', one.resident.kind, one.resident)
      i++
    } else if (one.type === 'leaves') {
      const was = stage.was(`hill:${one.place}`)
      if (was && 'place' in was) {
        stage.add(`gone:${one.place}`, was.what === 'single' ? 'little' : was.what, one.kind, { x: was.x, y: was.y, size: was.size }, true)
        stage.acts.push({ at: 0, lasts: 0.9, who: `gone:${one.place}`, do: 'fade' })
        stage.noise(0.25, swish())
      }
    } else if (one.type === 'ends') playChoir(stage, one.found, after)
    else if (one.type === 'rollCall') {
      const who = form === 'who'
      stage.t = stage.call('asker', one.asker, who) + BREATH
      for (const answer of one.answers) stage.t = stage.call(`slot:${answer.slot}`, answer.kind, !who) + BREATH
    } else if (one.type === 'peeks') {
      stage.acts.push({ at: 0, lasts: 0.5, who: 'edge', do: 'lunge', towards: -1 })
      stage.t = stage.call('edge', one.kind, form === 'who', 0.15)
    } else if (one.type === 'tips') {
      const basket = stage.was('basket'), to = { ...slotSpot(one.slot, one.slot + 1), size: EGG.h }
      const fromSpot: Spot = basket ? { x: basket.x, y: basket.y - 34, size: EGG.h } : to
      stage.add('bowl', 'bowl', one.kind, { x: fromSpot.x, y: fromSpot.y + 34, size: EGG.h }, true)
      stage.acts.push({ at: 0.2, lasts: 0.7, who: 'bowl', do: 'fade' })
      stage.noise(0, rustle())
      if (form === 'who') {
        // The egg joins those that wait to come to the stone, and its grown one walks in to a fourth spot.
        stage.add('tipped', 'egg', one.kind, fromSpot, true)
        stage.acts.push({ at: 0, lasts: TIP_FLY, who: 'tipped', do: 'fly', to: offPage(view, EGG.h * 0.6) })
        stage.add('in', 'grown', one.kind, { x: view.x + view.w - EDGE_PEEK, y: FLOOR, size: rowSize(one.kind, one.slot + 1) }, true)
        stage.go('in', one.kind, { ...to, size: rowSize(one.kind, one.slot + 1) }, 0.1, WALK, 3)
        stage.t = 0.1 + WALK
      } else {
        stage.add('tipped', 'egg', one.kind, fromSpot, true)
        stage.acts.push({ at: 0, lasts: TIP_FLY, who: 'tipped', do: 'fly', to })
        stage.noise(TIP_FLY, plop(one.slot))
        stage.t = TIP_FLY
        if (stage.after.leaves) {
          // Among leaf piles it lands as the egg it is, and leaves fall over it: a heap comes down on it with a
          // rustle while the egg sinks out of sight, and it is a hide like the others of the row.
          stage.add('leaves', 'pile', one.kind, { ...to, y: to.y - LEAF_FALL }, false)
          stage.acts.push({ at: TIP_FLY, lasts: LEAVES_FALL, who: 'leaves', do: 'slide', to }, { at: TIP_FLY, lasts: LEAVES_FALL, who: 'tipped', do: 'sink' })
          stage.noise(TIP_FLY + LEAVES_FALL * 0.6, rustle())
          stage.t = TIP_FLY + LEAVES_FALL
        }
      }
      stage.hide(`slot:${one.slot}`)
      // Its grown one, or its egg, now waits at the edge: if nobody waited there before, it comes into view.
      if (!stage.was('edge')) stage.nextAppears(0.3)
    } else if (one.type === 'basket' && one.kind !== null) {
      stage.acts.push({ at: 0, lasts: 0.5, who: 'basket', do: 'lunge', towards: 1 })
      stage.noise(0, knock(0.5))
      stage.t = stage.call('basket', one.kind, true, 0.06)
    }
  }
  const play = stage.done()
  if (play.acts.length === 0) return null
  // Every touch is answered when the finger lands: a play whose first sound comes later starts with the soft knock of the finger.
  if (!play.sounds.some((sound) => sound.at <= 0.02)) play.sounds.unshift({ at: 0, puffs: soft(knock(0.5), 0.6) })
  return play
}

/**
 * The one a round is sung with: whoever on the hill was tapped last with nothing else touched since (`last`),
 * when the one tapped now is the other kind of its family. However long the child waited between the two taps:
 * the round works every time.
 */
export function roundWith(world: World, last: { kind: Kind; place: number } | null, now: Resident): Resident | null {
  if (!last || last.place === now.place) return null
  const first = world.hill.find((one) => one.place === last.place && one.kind === last.kind)
  return first && singsRound(first.kind, now.kind) ? first : null
}

/** The round, a secret: two of one family on the hill, tapped one straight after the other. */
export function directRound(first: Resident, second: Resident, world: World, view: Rect): Play {
  const picture = pictureOf(world, view), stage = new Stage(picture, picture, 0), key = (one: Resident) => `hill:${one.place}`
  for (const cue of round(first.kind, second.kind)) {
    if (cue.cue === 'calls') stage.call(key(cue.who === first.kind ? first : second), cue.who, false, cue.at)
    else if (cue.cue === 'together') { stage.call(key(first), first.kind, false, cue.at); stage.call(key(second), second.kind, false, cue.at) }
  }
  // The finger is answered as it lands, with a knock, though the one under it sings second.
  stage.noise(0, soft(knock(WEIGHT[second.kind]), 0.6))
  return stage.done()
}

/** How many taps on the one who asks, one straight after the other, leave it out of breath. */
export const BREATHLESS = 4

/** How long the gulp of air takes. */
export const GULP = 0.9

/**
 * The one who asks has been tapped again and again and is out of breath: this time it takes one huge gulp of air
 * first, heard as the finger lands, and then calls, and everyone still hidden answers in turn, as every time.
 * `play` is the play of that tap on it; everything in it comes after the gulp.
 */
export function withGulp(play: Play): Play {
  const later = <T extends { at: number }>(one: T): T => ({ ...one, at: one.at + GULP })
  return { ...play, acts: [{ at: 0, lasts: GULP, who: 'asker', do: 'gulp' }, ...play.acts.map(later)], sounds: [{ at: 0, puffs: gasp() }, ...play.sounds.map(later)], seconds: play.seconds + GULP }
}

/** A tap on the bare page: only a sound. `across` is where the finger landed, 0 to 1 over the page. */
export function flickSound(across: number): Sounded[] {
  return [{ at: 0, puffs: flick(across) }]
}

/** A tap on something that cannot be tapped, heard by what it is: grass on the hill, a tick on the stone, paper on the bare page. */
export function bareSound(of: 'hill' | 'stone' | 'page', across: number): Sounded[] {
  return [{ at: 0, puffs: of === 'hill' ? brush() : of === 'stone' ? tick() : flick(across) }]
}

/** A call has a beat at its start and one every BEAT seconds after that for as long as it sounds; a gap is half way from one beat to the next. */
export const BEAT = 0.3
/** The soonest a voice follows the finger: the knock that answers the touch comes first. */
const AT_ONCE = 0.03

/**
 * A tap on someone on the hill while another one there calls, `since` seconds into that call and with `remaining`
 * seconds of it still to come: it joins in, in its own way (the fifth column of the grid in ART.md). `pip` peeps
 * on every beat of the other's call that is still to come; `tok` puts the two notes of its double peep into the
 * next two gaps between the beats; `hoom` and `brrl` sound with it at once, underneath and around; `wheep` answers
 * it and `dooo` finishes it once it is over. Returns the sounds, and for the picture when its own call starts,
 * or as a list when each single note of it starts. The finger is answered with a knock as it lands, whenever the
 * voice comes.
 */
export function joinSound(kind: Kind, remaining: number, since = 0): { sounds: Sounded[]; callsAfter: number | number[] } {
  const knocked: Sounded = { at: 0, puffs: soft(knock(WEIGHT[kind]), 0.6) }, call = { kind, inside: false }
  if (kind === 'wheep' || kind === 'dooo') { const after = Math.max(AT_ONCE, remaining + 0.05); return { sounds: [knocked, { at: after, call }], callsAfter: after } }
  if (kind === 'pip') {
    // The beats of the other's call from now to its end, counted from its start. One peep in any case.
    const beats: number[] = []
    for (let k = Math.ceil((since + AT_ONCE) / BEAT); k * BEAT < since + remaining - 1e-9 && beats.length < 4; k++) beats.push(k * BEAT - since)
    if (beats.length === 0) beats.push(AT_ONCE)
    return { sounds: [knocked, ...beats.map((at) => ({ at, call }))], callsAfter: beats }
  }
  if (kind === 'tok') {
    // The next two gaps, each half way between two beats of the other's call, whether or not that call lasts so long.
    const first = (Math.ceil((since + AT_ONCE) / BEAT - 0.5) + 0.5) * BEAT - since, gaps = [first, first + BEAT]
    return { sounds: [knocked, ...gaps.map((at, note) => ({ at, call: { ...call, note } }))], callsAfter: gaps }
  }
  return { sounds: [knocked, { at: AT_ONCE, call }], callsAfter: AT_ONCE }
}

/** A tap on someone on the hill: a soft knock and its call. */
export function callSound(kind: Kind): Sounded[] {
  return [{ at: 0, puffs: soft(knock(WEIGHT[kind]), 0.6) }, { at: 0.03, call: { kind, inside: false } }]
}

/** Where a cast member of a play stands when the play is over: the last place it was sent. */
export function finalSpot(play: Play, id: string): Spot | null {
  const cast = play.cast.find((one) => one.id === id)
  if (!cast) return null
  let spot = cast.from
  for (const act of play.acts) if (act.who === id && (act.do === 'go' || act.do === 'fly' || act.do === 'slide' || act.do === 'roll')) spot = act.to
  return spot
}
