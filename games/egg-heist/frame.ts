import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'
import { REST, poseOf, thingPose, type Pose, type ThingPose } from './gestures'
import { AFLOAT, CROW, DOG, FROG, GOOSE_AT, HANG, KENNEL, LINE, LOOKS, MOUND, ON_HIM, POLE, REEDS, SAG, SCARECROW, SHOVED, WASHING, WATER, lineAt, restMiddle, showSpot, type Look } from './looks'
import { AJAR, AWAKE_SECONDS, SETTLE_SECONDS, WHISTLES_AT, DIZZY_SECONDS, FLY_SECONDS, HOP_SECONDS, PUSH_SECONDS, STARTLED_SECONDS, WHISK_SECONDS, type Yard } from './model'
import {
  appleFall, bushShake, cloudBob, doorShake, fenceHop, frameKnock, gooseRuffle, hillBird, sunSpin, crowCaws, crowPeck, dogGrowl, leafSlide, lickDrops, curtainSway, dogPant, dogTail, farmerNod, frogBlinks, frogHop, gooseLook, gooseNestLook, gooseStartle, gooseStrut,
  gooseWaddle, placeNudge, raccoonFidget, raccoonPeep, raccoonPerk, raccoonPoke, raccoonPush, scarecrowSway, sunTurn, thingHop, thingLand, washingSwing,
} from './motion'
import { GOES_IN, GRID, SENDS, type Act, type Actor, type Cell, type Travel } from './pairings'
import { CARDS, EYES, RACCOON_SIZE, type CardId } from './sprites'
import { STAGE } from './stage'
import { BUSHES, CLOUDS, DOOR, FENCE, FLOOR, HOME, PLACE_IDS, ROUND, ROWS, ROW_SCALE, STRIP, THINGS, gooseAt, type Loc, type PlaceId, type ThingId } from './yard'

// One frame as a list of what is drawn, in order, with no canvas in sight:
// cards that were painted once and are stamped, and a few live strokes for
// what moves behind or over them (the goose's gaze, the wires, the rope of
// the washing line, the pupils on their tabs). The renderer walks the list,
// and the frame-budget test counts it: a canvas game's draw count is this
// list's length. A pairing that is playing is read from the same timeline
// the model sounds it from (pairings.ts), so a sound and its maker's move
// cannot drift apart.

export type Stamp = {
  kind: 'stamp'; card: CardId; x: number; y: number; tilt: number; sx: number; sy: number; alpha: number
  /** Nothing of the card is drawn below this height: a figure down behind a bush, a thing afloat. */
  cutBelow?: number
  /** Who this is, for the tests that ask what a figure is drawn doing. */
  who?: Actor | ThingId | 'raccoon' | 'farmer' | 'door'
}
export type Live =
  /** The goose's gaze on the floor. `hot` is 0..1 through her double-take. */
  | { kind: 'gaze'; points: { x: number; y: number }[]; hot: number }
  /** The wire a figure is pushed along by, from its base to the wing. */
  | { kind: 'wire'; x1: number; y1: number; x2: number; y2: number }
  /** The rope of the washing line, through these points. */
  | { kind: 'rope'; points: { x: number; y: number }[] }
  /** Pupils behind the eye holes of a card. `look` is where they are pulled to, in stage units; `spin` rolls them. */
  | { kind: 'pupils'; eyes: { x: number; y: number; r: number }[]; dx: number; dy: number; shut: boolean }
  /** The glow on what can be touched: a pale disc under it. */
  | { kind: 'glow'; x: number; y: number; r: number; alpha: number }
  /** Lines bursting from an open beak. */
  | { kind: 'burst'; x: number; y: number; face: number; k: number }
export type Item = Stamp | Live

/** Where things stand that the model has no say in. */
export const SET = {
  sun: { x: 384, y: 128 },
  line: LINE,
  washing: WASHING,
  pole: POLE,
  farmer: { x: 1000, y: 352 },
  scarecrow: SCARECROW,
  crow: CROW,
  nest: { x: 650, y: 470 },
  kennel: KENNEL,
  dog: DOG,
  dogTail: { x: 1018, y: 716 },
  bowl: { x: 884, y: 744 },
  lily: { x: 520, y: 722 },
  frog: FROG,
  reeds: REEDS,
  pelmetY: 0,
  apronY: 764,
  curtainY: 46,
} as const

export { SAG, lineAt }

const stamp = (card: CardId, x: number, y: number, tilt = 0, sx = 1, sy = sx, alpha = 1): Stamp => ({ kind: 'stamp', card, x, y, tilt, sx, sy: Math.abs(sy), alpha })
const as = (who: Stamp['who'], s: Stamp): Stamp => { s.who = who; return s }
const clamp01 = (k: number): number => Math.min(1, Math.max(0, k))
const ease = (k: number): number => { const t = clamp01(k); return t * t * (3 - 2 * t) }
const arch = (k: number): number => Math.sin(Math.PI * clamp01(k))

/** How large a figure is drawn with its feet at height `y`: between the grooves' own sizes. */
export function scaleAt(y: number): number {
  if (y <= ROWS[0]) return ROW_SCALE[0]
  for (let row = 1; row < ROWS.length; row++) {
    if (y <= ROWS[row]) return ROW_SCALE[row - 1] + ((ROW_SCALE[row] - ROW_SCALE[row - 1]) * (y - ROWS[row - 1])) / (ROWS[row] - ROWS[row - 1])
  }
  return ROW_SCALE[ROWS.length - 1]
}

// --- What a scene shows -----------------------------------------------------------

/** A place and the thing shown in it, with how far into that pairing's own seconds the picture is. */
export type CellNow = { thing: ThingId; place: PlaceId; cell: Cell; u: number }

export type Showing = {
  at: Record<PlaceId, CellNow | null>
  /** Where each thing is shown: where it lies, or on its way through the air. */
  loc: Record<ThingId, Loc | { at: 'air'; travel: Travel }>
  /** A place that is sending its old thing on right now, and how far through that it is. */
  sending: { place: PlaceId; k: number } | null
  /** Seconds into the scene, or -1. */
  t: number
  /** The thing just taken out of each place, and how long ago. */
  left: Yard['left']
}

/**
 * What is shown where, now. With no scene playing that is the state itself, every place at its last picture.
 * While one plays, the state already holds its end, so the picture is rebuilt from where the things were when
 * it started and how far the scene has got.
 */
export function showing(yard: Yard): Showing {
  const at = Object.fromEntries(PLACE_IDS.map((place) => [place, null])) as Showing['at']
  const loc = {} as Showing['loc']
  const scene = yard.scene
  let sending: Showing['sending'] = null
  for (const id of THINGS) loc[id] = scene ? scene.before[id] : yard.things[id]
  if (scene) {
    const t = scene.t
    for (const travel of scene.plan.travels) {
      if (t < travel.leaves) continue
      loc[travel.thing] = t < travel.arrives ? { at: 'air', travel } : travel.to === 'floor' ? yard.things[travel.thing] : { at: travel.to }
    }
    for (const step of scene.plan.timed) if (step.sends && t >= step.at && t < step.at + GOES_IN) sending = { place: step.place, k: (t - step.at) / GOES_IN }
  }
  for (const id of THINGS) {
    const where = loc[id]
    if (where.at === 'floor' || where.at === 'paws' || where.at === 'air') continue
    const place = where.at
    let u = Infinity
    if (scene) {
      for (const step of scene.plan.timed) {
        if (step.thing !== id || step.place !== place) continue
        const since = scene.t - step.at - GOES_IN
        u = since < 0 ? step.w0 : scene.t < step.at + step.len ? Math.min(step.w1, step.w0 + since) : Infinity
      }
    }
    at[place] = { thing: id, place, cell: GRID[id][place], u }
  }
  return { at, loc, sending, t: scene ? scene.t : -1, left: yard.left }
}

/** The act of `who` that the picture is in: the one playing, else the last one over (held at its end), else the first to come (held at its start). */
function actOf(now: CellNow | null, who: Actor): { act: Act; k: number } | null {
  if (!now) return null
  let last: Act | null = null, first: Act | null = null
  for (const act of now.cell.acts) {
    if (act.who !== who) continue
    if (now.u >= act.at && now.u < act.at + act.len) return { act, k: (now.u - act.at) / act.len }
    if (now.u >= act.at + act.len) last = act
    else if (!first) first = act
  }
  return last ? { act: last, k: 1 } : first ? { act: first, k: 0 } : null
}

/** Every act of `who` that is playing at this moment: the small props are drawn only while one is. */
function playingOf(now: CellNow | null, who: Actor): { act: Act; k: number }[] {
  if (!now) return []
  return now.cell.acts.filter((act) => act.who === who && now.u >= act.at && now.u < act.at + act.len).map((act) => ({ act, k: (now.u - act.at) / act.len }))
}

/** Whether `who` has started the act `does` in the picture, playing or over: what stays once it has happened. */
function reached(now: CellNow | null, who: Actor, does: string): number {
  if (!now) return 0
  const act = now.cell.acts.find((a) => a.who === who && a.does === does)
  return !act || now.u < act.at ? 0 : clamp01((now.u - act.at) / act.len)
}

/** How far a card tips, over and above the turn itself, as it settles. */
const SETTLE_TIP = 0.08
const OWNERS: Partial<Record<Actor, PlaceId>> = { frog: 'pond', dog: 'bowl', tail: 'bowl', bowl: 'bowl', crow: 'scarecrow', scarecrow: 'scarecrow', nest: 'nest', line: 'line', pole: 'line' }

/** How a place's owner stands now: sending a thing on, in the middle of a pairing, or as the last pairing left it. */
export function ownerPose(show: Showing, who: Actor): Pose {
  const place = OWNERS[who]
  if (!place) return REST
  if (show.sending && show.sending.place === place && SENDS[place].who === who) return poseOf(who, SENDS[place].does, show.sending.k)
  const found = actOf(show.at[place], who)
  const to = found ? poseOf(who, found.act.does, found.k) : REST
  // Its thing was just taken out: the card tips over from the picture it was in and settles, and is swapped halfway.
  const gone = show.left[place]
  if (!gone || show.at[place] || show.t >= 0) return to
  const was = actOf({ thing: gone.thing, place, cell: GRID[gone.thing][place], u: Infinity }, who)
  if (!was) return to
  const from = poseOf(who, was.act.does, was.k), k = ease(gone.t / SETTLE_SECONDS)
  const mix = (a: number, b: number): number => a + (b - a) * k
  // The shortest way round, so a figure on its back gets up in half a turn and not a turn and a half.
  const turn = Math.atan2(Math.sin(to.tilt - from.tilt), Math.cos(to.tilt - from.tilt))
  return { ...(k < 0.5 ? from : to), dx: mix(from.dx, to.dx), dy: mix(from.dy, to.dy), tilt: to.tilt - turn * (1 - k) + SETTLE_TIP * arch(k), flip: mix(from.flip, to.flip), scale: mix(from.scale, to.scale), alpha: mix(from.alpha, to.alpha) }
}

// --- The goose in a scene ---------------------------------------------------------

const ARC = 0.4, BACK = 0.5
type GooseSpot = { x: number; y: number; face: 1 | -1; cut?: number }

function spotOf(does: string, lane: GooseSpot): GooseSpot {
  if (does === 'lookUp' || does === 'squawk') return lane
  if (does === 'dive' || does === 'climbOut') return { ...GOOSE_AT.pond, cut: WATER }
  if (does === 'hopUnder') return GOOSE_AT.under
  return GOOSE_AT.nest
}

export type GooseScene = { x: number; y: number; face: 1 | -1; pose: Pose; cut?: number; lifted: boolean; acting: boolean }

/** Where the goose is and what she is doing while a scene plays: at her round until a pairing needs her, lifted over to it, and lifted back. */
export function gooseInScene(yard: Yard): GooseScene {
  const scene = yard.scene!
  const t = scene.t
  const from = gooseAt(scene.gooseFrom.leg, scene.gooseFrom.along), to = gooseAt(yard.goose.leg, yard.goose.along)
  const lane: GooseSpot = { x: from.x, y: from.y, face: from.face }
  const home: GooseSpot = { x: to.x, y: to.y, face: to.face }
  const between = (a: GooseSpot, b: GooseSpot, k: number): GooseScene => {
    const e = ease(k)
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - 70 * arch(k), face: b.x === a.x ? b.face : b.x < a.x ? -1 : 1, pose: { ...REST, card: 'gooseHonk', tilt: 0.14 * arch(k) }, lifted: true, acting: false }
  }
  let rests: GooseSpot = lane
  for (const step of scene.plan.timed) {
    const acts = GRID[step.thing][step.place].acts.filter((act) => act.who === 'goose')
    const seen = acts.filter((act) => act.at + act.len > step.w0 && act.at < step.w1)
    if (!seen.length) continue
    const zero = step.at + GOES_IN - step.w0
    const start = zero + Math.max(step.w0, seen[0].at)
    const end = zero + Math.min(step.w1, Math.max(...seen.map((act) => act.at + act.len)))
    const first = spotOf(seen[0].does, lane)
    if (t < start - ARC) break
    if (t < start) return first === rests ? { ...rests, pose: REST, lifted: false, acting: false } : between(rests, first, (t - (start - ARC)) / ARC)
    const last = spotOf(seen[seen.length - 1].does, lane)
    if (t <= end) {
      const u = t - zero
      let current = seen[0], next: Act | null = null
      for (const act of seen) { if (act.at <= u) current = act; else if (!next) next = act }
      const here = spotOf(current.does, lane)
      if (next && u >= current.at + current.len) {
        const there = spotOf(next.does, lane)
        if (there !== here && (there.x !== here.x || there.y !== here.y) && u >= next.at - ARC) return between(here, there, (u - (next.at - ARC)) / ARC)
      }
      const k = clamp01((u - current.at) / current.len)
      return { ...here, pose: poseOf('goose', current.does, k), lifted: false, acting: u < current.at + current.len }
    }
    rests = home
    if (t < end + BACK && (last.x !== home.x || last.y !== home.y)) return between(last, home, (t - end) / BACK)
  }
  // A goose with no part in the scene is lifted on her wire, as it ends, to the lane she walks on from.
  if (rests === lane && (lane.x !== home.x || lane.y !== home.y)) {
    const k = (t - (scene.plan.total - BACK)) / BACK
    if (k > 0) return between(lane, home, clamp01(k))
  }
  return { ...rests, pose: REST, lifted: false, acting: false }
}

// --- The figures as they are seen -------------------------------------------------

/** The eye holes of a stamped card, on the stage. */
function eyesOf(s: Stamp): { x: number; y: number; r: number }[] {
  const card = CARDS[s.card], eyes = EYES[s.card] ?? []
  const cos = Math.cos(s.tilt), sin = Math.sin(s.tilt)
  return eyes.map((eye) => {
    const lx = (eye.x - card.ax) * s.sx, ly = (eye.y - card.ay) * s.sy
    return { x: s.x + lx * cos - ly * sin, y: s.y + lx * sin + ly * cos, r: eye.r * s.sy }
  })
}

function pupils(s: Stamp, towards: { x: number; y: number }, shut = false): Live {
  const eyes = eyesOf(s)
  const from = eyes[0] ?? { x: s.x, y: s.y }
  const d = Math.hypot(towards.x - from.x, towards.y - from.y) || 1
  return { kind: 'pupils', eyes, dx: (towards.x - from.x) / d, dy: (towards.y - from.y) / d, shut }
}

type Seen = { x: number; y: number; tilt: number; scale: number; face: 1 | -1 }

/** How far a raccoon in a bush is sunk into its groove: its ears and eyes stay over the top. */
const SUNK = 26
/** With a thing held up it stands taller, so it goes further down: its head and the thing show, and no more. */
const SUNK_CARRYING = 56

/** The raccoon as it is seen: where its feet are, its lean, and how far it has sunk behind a bush. */
export function raccoonSeen(yard: Yard): Seen & { card: CardId; flying: boolean; sunk: number } {
  const r = yard.raccoon
  const carrying = yard.carried() !== null
  if (r.mode === 'shock' || r.mode === 'fly') {
    const from = { x: r.flownFrom.x, y: ROWS[r.flownFrom.row] - 60 }
    const size = ROW_SCALE[r.flownFrom.row] * RACCOON_SIZE
    if (r.mode === 'shock') return { card: 'raccoonShock', x: from.x, y: from.y - 8 * Math.abs(Math.sin(r.t * 40)), tilt: 0, scale: size, face: r.face, flying: true, sunk: 0 }
    const k = Math.min(1, r.t / FLY_SECONDS)
    const to = { x: HOME.x, y: ROWS[HOME.row] - 50 }
    return {
      card: 'raccoonShock', x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - 330 * 4 * k * (1 - k),
      tilt: -k * Math.PI * 4, scale: size + (ROW_SCALE[HOME.row] * RACCOON_SIZE - size) * k, face: r.face, flying: true, sunk: 0,
    }
  }
  let y: number = ROWS[r.row], tilt = 0
  if (r.mode === 'hop') {
    const k = Math.min(1, r.t / HOP_SECONDS)
    // A tap that lands in the middle of a hop is answered there too: the ears go up in the air.
    const perk = raccoonPerk(yard.stir.perk)
    y = ROWS[r.fromRow] + (ROWS[r.toRow] - ROWS[r.fromRow]) * k - 34 * Math.sin(Math.PI * k) + perk.lift
    tilt = -r.face * 0.2 * Math.sin(Math.PI * k) + r.face * perk.tilt
  } else if (r.mode === 'push') {
    // A tap that lands in the middle of a creep is answered in it: the ears go up over the lean of the push.
    const lean = raccoonPush(r.t / PUSH_SECONDS), perk = raccoonPerk(yard.stir.perk)
    tilt = r.face * (lean.tilt + perk.tilt)
    y += lean.lift + perk.lift
  } else if (r.mode === 'dizzy') {
    tilt = 0.3 * Math.sin(r.t * 15) * Math.max(0, 1 - r.t / DIZZY_SECONDS)
  } else {
    // Standing: the jerk to attention at a tap, the lean of a poke or of putting a thing in, and else a twitch now and then.
    const perk = raccoonPerk(yard.stir.perk)
    const putsIn = yard.scene && yard.scene.t < GOES_IN ? 0.28 * arch(yard.scene.t / GOES_IN) : 0
    tilt = raccoonFidget(r.rested) + r.face * (perk.tilt + raccoonPoke(yard.stir.poke, yard.poked === 'pond') + putsIn)
    y += perk.lift
  }
  // Down behind the bush with only its ears and eyes over the top; it peeps up now and then.
  const sunk = yard.hidden ? (carrying ? SUNK_CARRYING : SUNK) - 20 * (r.mode === 'still' ? raccoonPeep(r.rested) : 0) : 0
  return { card: carrying ? 'raccoonCarry' : 'raccoon', x: r.x, y, tilt, scale: scaleAt(y) * RACCOON_SIZE, face: r.face, flying: false, sunk }
}

/** Where the goose is drawn: in her groove, on the nest behind the back groove, in the pond, or lifted over everything. */
export type GooseLayer = 'groove' | 'nest' | 'pond' | 'over'
export type GooseSeen = Seen & { card: CardId; flip: number; layer: GooseLayer; row: number; cut?: number; wire: boolean }

/** The goose as she is seen. `flip` is the card's width as she turns on her stick: 1 to -1 through 0. */
export function gooseSeen(yard: Yard): GooseSeen {
  const g = yard.goose
  const now = yard.gooseNow()
  const base = { x: now.x, y: now.y, scale: scaleAt(now.y), face: now.face, layer: 'groove' as GooseLayer, row: now.row, wire: true }
  const off = { ...base, layer: 'over' as GooseLayer, wire: false }
  switch (g.mode) {
    case 'round': {
      const leg = ROUND[g.leg], on = gooseAt(g.leg, g.along)
      if (leg.kind === 'walk') { const w = gooseWaddle(yard.time); return { ...base, card: 'goose', y: now.y + w.lift, tilt: w.tilt, flip: now.face } }
      if (leg.kind === 'look') return { ...base, card: 'goose', tilt: now.face * gooseLook(g.along), flip: now.face }
      if (leg.kind === 'nest') {
        const look = gooseNestLook(g.along, g.nestSaw)
        return { ...base, card: look.alert ? 'gooseAlert' : 'goose', y: now.y + look.lift, tilt: now.face * look.tilt, flip: now.face }
      }
      // A hop to the other groove: lifted, turned on her stick, and set down.
      return { ...base, card: 'goose', y: now.y - 26 * Math.sin(Math.PI * on.hop), tilt: 0, flip: leg.faceFrom * Math.cos(Math.PI * on.hop) }
    }
    case 'scene': {
      const s = gooseInScene(yard)
      const y = s.y + s.pose.dy
      const layer: GooseLayer = s.lifted ? 'over' : s.cut !== undefined ? 'pond' : s.y === GOOSE_AT.nest.y ? 'nest' : 'groove'
      return {
        card: s.pose.card ?? 'goose', x: s.x + s.face * s.pose.dx, y, tilt: s.face * s.pose.tilt, scale: scaleAt(s.y), face: s.face,
        flip: s.face * s.pose.flip, layer, row: yard.gooseNow().row, cut: s.cut, wire: layer === 'groove' && !s.acting,
      }
    }
    case 'take': return { ...base, card: 'gooseAlert', tilt: now.face * -0.04, flip: now.face }
    case 'glare': return { ...base, card: 'gooseAlert', tilt: 0, flip: now.face }
    case 'relax': return { ...base, card: 'goose', tilt: now.face * 0.06 * Math.sin(Math.min(1, g.t / 0.5) * Math.PI), flip: now.face }
    case 'honk': return { ...base, card: 'gooseHonk', y: now.y - 12 * Math.abs(Math.sin(g.t * 22)), tilt: 0, flip: now.face }
    case 'dash': return { ...off, card: 'gooseHonk', tilt: now.face * 0.24, flip: now.face }
    case 'kick': return { ...off, card: 'gooseKick', tilt: now.face * -0.16 * Math.min(1, g.t / 0.1), flip: now.face }
    case 'strut': { const s = gooseStrut(g.t); return { ...off, card: 'gooseStrut', y: now.y + s.lift, tilt: now.face * s.tilt, flip: now.face } }
    case 'startled': {
      const s = gooseStartle(g.t / STARTLED_SECONDS)
      const on = gooseAt(g.leg, g.along)
      // She spins on her stick and comes down facing the pluck.
      const turned = s.turns >= 3 ? g.face : on.face * Math.cos(Math.PI * s.turns)
      return { ...base, card: 'gooseHonk', y: now.y + s.lift, tilt: 0, flip: turned }
    }
  }
}

/** Where the top of the goose's head is, for a boot that is stuck on it. */
function headOf(goose: GooseSeen): { x: number; y: number; tilt: number } {
  const reach = 196 * goose.scale
  return { x: goose.x + goose.face * 44 * goose.scale + Math.sin(goose.tilt) * reach, y: goose.y - Math.cos(goose.tilt) * reach, tilt: goose.tilt }
}

export type ThingSeen = { x: number; y: number; tilt: number; scale: number; aloft: boolean }

/** A thing that lies on the floor or is in the paws, as it is seen: where its foot is, its tilt, and how large. */
export function thingSeen(yard: Yard, id: ThingId, loc: Loc = yard.things[id]): ThingSeen {
  const move = yard.moves[id]
  const rest = loc.at === 'floor' ? { x: loc.x, y: ROWS[loc.row] + STRIP } : yard.seenAt(id)
  const scale = loc.at === 'floor' ? ROW_SCALE[loc.row] : loc.at === 'paws' ? ROW_SCALE[yard.raccoon.row] : 0.9
  if (move?.kind === 'pop' || move?.kind === 'whisk') {
    const lasts = move.kind === 'pop' ? 0.6 : WHISK_SECONDS
    if (move.t < 0) return { x: move.fromX, y: move.fromY, tilt: 0, scale, aloft: true }
    const k = Math.min(1, move.t / lasts)
    const high = move.kind === 'pop' ? 150 : 70
    return { x: move.fromX + (rest.x - move.fromX) * k, y: move.fromY + (rest.y - move.fromY) * k - high * 4 * k * (1 - k), tilt: (move.kind === 'pop' ? 5 : 0.6) * k * (1 - k) * 4, scale, aloft: true }
  }
  if (loc.at === 'paws') return inPaws(yard)
  if (move?.kind === 'hop') { const m = thingHop(id, move.t / 0.34); return { x: rest.x, y: rest.y + m.lift, tilt: m.tilt, scale, aloft: false } }
  if (move?.kind === 'land') { const m = thingLand(id, move.t); return { x: rest.x + m.slide, y: rest.y + m.lift, tilt: m.tilt, scale, aloft: false } }
  return { x: rest.x, y: rest.y, tilt: 0, scale, aloft: false }
}

/** Where a thing is held: over the raccoon's head, in its paws. */
function inPaws(yard: Yard): ThingSeen {
  const seen = raccoonSeen(yard)
  const reach = (seen.card === 'raccoonCarry' ? 148 : 120) * seen.scale
  return { x: seen.x + seen.face * 4 + Math.sin(seen.tilt) * reach * 0.9, y: seen.y + seen.sunk - reach * Math.cos(seen.tilt), tilt: seen.tilt * 1.6, scale: ROW_SCALE[yard.raccoon.row], aloft: false }
}

// --- A thing in a place ------------------------------------------------------------

type Stage = {
  yard: Yard
  show: Showing
  t: number
  /** The scarecrow's sway and how he stands, which everything on him follows. */
  sway: number
  scare: Pose
  /** How far the dog has shoved his bowl. */
  bowlAt: number
  /** How far the line has sagged under the potato. */
  sag: number
  goose: GooseSeen
}

/** A thing in a place, as that pairing shows it now: null when it is out of sight (the egg under the mound). */
export function thingInPlace(c: Stage, now: CellNow): Stamp | null {
  const look: Look = LOOKS[now.place][now.thing]
  const found = actOf(now, 'thing')
  const pose: ThingPose = found ? thingPose(found.act.does, found.k) : REST
  const turned = now.cell.turns === undefined || now.u >= now.cell.turns
  if (now.thing === 'egg' && now.place === 'bowl' && turned) return null
  const card: CardId = turned && look.card ? look.card : now.thing
  let x = !turned && look.before ? look.before.x : look.x, y = !turned && look.before ? look.before.y : look.y
  let scale = look.scale, alpha = look.alpha
  if (now.place === 'pond' && look.alpha < 1) {
    // What sinks goes down from where it floated, and dims.
    const into = pose.into ?? 1
    y = AFLOAT.y + (look.y - AFLOAT.y) * into
    alpha = 1 + (look.alpha - 1) * into
    scale = AFLOAT.scale + (look.scale - AFLOAT.scale) * into
  }
  // At the nest a thing's moves are along the goose's facing, like hers.
  const dir = now.place === 'nest' ? -1 : 1
  x += dir * pose.dx
  y += pose.dy
  let tilt = look.tilt + dir * pose.tilt
  if (now.place === 'scarecrow') { y += c.scare.dy; x += (SET.scarecrow.y - y) * c.sway; tilt += c.sway }
  if (now.place === 'bowl') x += c.bowlAt
  // The potato hangs at the point of the V, and goes down with it as the line sags.
  if (now.place === 'line' && now.thing === 'potato') y -= lineAt(HANG.u, 1).y - lineAt(HANG.u, c.sag).y
  if (pose.onGoose) { const head = headOf(c.goose); x = head.x; y = head.y + 8; tilt = head.tilt + Math.PI }
  const s = as(now.thing, stamp(card, x, y, tilt, scale * pose.scale, scale * pose.scale, alpha * pose.alpha))
  if (look.cut !== undefined) s.cutBelow = look.cut
  return s
}

/** Where a thing is on its way from one spot to another, or null while it is out of sight over the pelmet. */
export function travelling(c: Stage, travel: Travel): ThingSeen | null {
  const yard = c.yard, id = travel.thing
  const from = travel.from === 'paws' ? inPaws(yard) : LOOKS[travel.from === 'splash' ? 'pond' : travel.from][id]
  const end = travel.to === 'floor' ? yard.seenAt(id) : LOOKS[travel.to][id].before ?? LOOKS[travel.to][id]
  const to = { x: end.x, y: end.y - (travel.to === 'line' && id === 'potato' ? lineAt(HANG.u, 1).y - lineAt(HANG.u, 0).y : 0) }
  const lasts = travel.arrives - travel.leaves, since = c.t - travel.leaves
  const scale = 0.9
  const arc = (k: number, high: number, turns: number): ThingSeen => ({ x: from.x + (to.x - from.x) * ease(k), y: from.y + (to.y - from.y) * k - high * 4 * k * (1 - k), tilt: turns * Math.PI * 2 * k, scale, aloft: true })
  if (lasts > LONG_WAIT) {
    // A long wait is spent out of sight: lifted straight up past the pelmet, and let down into its place when its turn comes.
    if (since < LIFT_OUT) { const k = ease(since / LIFT_OUT); return { x: from.x, y: from.y + (OUT_OF_SIGHT - from.y) * k, tilt: 0.2 * Math.sin(k * 9), scale, aloft: true } }
    const left = travel.arrives - c.t
    if (left > LIFT_OUT) return null
    const k = ease(1 - left / LIFT_OUT)
    return { x: to.x, y: OUT_OF_SIGHT + (to.y - OUT_OF_SIGHT) * k, tilt: 0.2 * Math.sin(k * 9), scale, aloft: true }
  }
  const k = clamp01(since / lasts)
  switch (travel.from) {
    case 'paws': return arc(k, 34, 0)
    // Tipped out, it rolls down the boards.
    case 'nest': return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * ease(k) - 10 * Math.abs(Math.sin(k * Math.PI * 3)), tilt: -Math.PI * 4 * k, scale, aloft: true }
    case 'pond': return arc(k, 46, 2)
    case 'bowl': return arc(k, 210, 3)
    // Down the line it slides, hanging.
    case 'line': return { x: from.x + (to.x - from.x) * ease(k), y: from.y + (to.y - from.y) * ease(k), tilt: 0.3 * Math.sin(k * 20) * (1 - k), scale, aloft: true }
    case 'scarecrow': return arc(k, 110, 0)
    case 'splash': return arc(k, 230, 3)
  }
}

/** A thing sent on that waits longer than this for its turn waits out of sight. */
export const LONG_WAIT = 2.5
const LIFT_OUT = 0.5
const OUT_OF_SIGHT = -70

// --- The frame ---------------------------------------------------------------------

const hand: HandPose = { travel: 0, press: 0, opacity: 0 }
const TAU = Math.PI * 2
/** A card is never thinner than this as it turns on its stick. */
const thin = (flip: number): number => (Math.abs(flip) < 0.08 ? 0.08 * (flip < 0 ? -1 : 1) : flip)
/** Where along the line the cabbage's leaves hang as flags: clear of the washing. */
const FLAGS = [0.05, 0.1, 0.35, 0.45, 0.97] as const
/** How long the farmer keeps one eye open after a loud noise. */
export const NOISE_SECONDS = 1.2
/** The moves the frame draws itself, by who makes them: the places' own cards and the small props. */
export const FRAME_MOVES: Partial<Record<Actor, readonly string[]>> = {
  line: ['gust', 'sag', 'slideIn', 'chatter', 'letSlide'], pole: ['knocked'], nest: ['tip'], bowl: ['shoved'], feathers: ['burst'],
  leaves: ['fly', 'drop', 'blowAcross'], bubble: ['rise', 'pop', 'toFrog'], splash: ['small', 'great'], earth: ['fly'],
  sparrow: ['flyIn', 'tweet'], drip: ['fall'], flags: ['unroll', 'flutter'],
}

/** Where the glow lies: on the five places while the raccoon carries, and else on every thing that can be picked up. */
export function glowSpots(yard: Yard): { x: number; y: number; r: number }[] {
  if (yard.scene || yard.tidy.t >= 0) return []
  if (yard.carried()) return PLACE_IDS.map((id) => ({ ...showSpot(id), r: 64 }))
  const spots: { x: number; y: number; r: number }[] = []
  for (const id of THINGS) {
    if (yard.moves[id]) continue
    const loc = yard.things[id]
    if (loc.at === 'bowl' && id === 'egg') { spots.push({ x: MOUND.x, y: MOUND.y - 20, r: 56 }); continue }
    // A thing in a place glows where it is drawn there, on the card it has turned into.
    if (loc.at !== 'floor' && loc.at !== 'paws') { const mid = restMiddle(loc.at, id); spots.push({ x: mid.x, y: mid.y, r: 46 }); continue }
    const at = yard.seenAt(id)
    spots.push({ x: at.x, y: at.y - CARDS[id].h * 0.42, r: 46 })
  }
  return spots
}

/**
 * What the idle ladder's hand taps: the thing nearest the raccoon while its paws are empty, and one of the five
 * places while they are full, a different one at each showing (`Yard.showHand`).
 */
export function handTarget(yard: Yard): { x: number; y: number } | null {
  const r = yard.raccoon
  if (yard.carried()) {
    // The model chose the place as this showing came up: never the last one shown, never one the goose stands at.
    const shown = yard.hand.place
    return shown ? showSpot(shown) : null
  }
  let best: { x: number; y: number } | null = null, gap = Infinity
  for (const id of THINGS) {
    const loc = yard.things[id]
    if (loc.at === 'paws') continue
    const at = yard.seenAt(id)
    const d = Math.hypot(at.x - r.x, at.y - ROWS[r.row])
    if (d < gap) { gap = d; best = loc.at === 'floor' ? { x: at.x, y: at.y - 24 } : restMiddle(loc.at, id) }
  }
  return best
}

/** Whether `who` is in the middle of a move at its place: it then holds the move's pose and does not fidget. */
function busy(show: Showing, place: PlaceId, who: Actor): boolean {
  if (show.sending && show.sending.place === place && SENDS[place].who === who) return true
  return playingOf(show.at[place], who).length > 0
}

/** The whole frame, back to front. `yard` is null before the save has been read: the bare stage. */
export function compose(yard: Yard | null, guidance: Guidance | null): Item[] {
  const items: Item[] = [stamp('backdrop', 0, 0)]
  const t = yard?.time ?? 0

  items.push(stamp('sun', SET.sun.x, SET.sun.y, sunTurn(t) + (yard ? sunSpin(yard.stir.sun) : 0)))
  if (yard) {
    // The fence sends up its sparrow, and a small bird flies up out of the far hills where they were tapped.
    const bird = hillBird(yard.stir.hill)
    if (bird) items.push(stamp('sparrow', yard.toy.hillX + bird.dx, yard.toy.hillY + bird.dy, bird.tilt, 0.7, 0.7, bird.alpha))
    const hop = fenceHop(yard.stir.fence)
    if (hop) items.push(stamp('sparrow', yard.toy.fenceX + hop.along, FENCE.top + 8 + hop.lift, 0, 1, 1, hop.alpha))
  }
  CLOUDS.forEach((cloud, i) => items.push(stamp('cloud', yard ? yard.cloudX(i) : cloud.x, cloud.y + (yard ? cloudBob(yard.stir.cloud[i]) : 0), 0, cloud.scale)))

  if (!yard) {
    pushLine(items, null, t, 0, 0, 0)
    items.push(stamp('pole', SET.pole.x, SET.pole.y, 0, ROW_SCALE[0]), stamp('farmer', SET.farmer.x, SET.farmer.y), stamp('halfDoor', DOOR.x, SET.farmer.y))
    items.push(stamp('scarecrow', SET.scarecrow.x, SET.scarecrow.y), stamp('crow', SET.crow.x, SET.crow.y), stamp('nest', SET.nest.x, SET.nest.y))
    for (const bush of BUSHES) items.push(stamp('bush', bush.x, ROWS[bush.row] + 10, 0, ROW_SCALE[bush.row]))
    items.push(stamp('kennel', SET.kennel.x, SET.kennel.y), stamp('dog', SET.dog.x, SET.dog.y), stamp('bowl', SET.bowl.x, SET.bowl.y), stamp('lily', SET.lily.x, SET.lily.y), stamp('frog', SET.frog.x, SET.frog.y), stamp('reeds', SET.reeds.x, SET.reeds.y))
    pushProscenium(items, 99, 0, 0)
    return items
  }

  const show = showing(yard)
  const raccoon = raccoonSeen(yard), goose = gooseSeen(yard)
  // Every eye in the yard is on the raccoon, wherever it is; the goose looks down her gaze.
  const watched = { x: raccoon.x, y: raccoon.y + raccoon.sunk - 70 * raccoon.scale }
  const sway = scarecrowSway(t) + placeNudge(yard.stir.place.scarecrow)
  const atLine = show.at.line, atBowl = show.at.bowl
  const c: Stage = {
    yard, show, t: show.t, sway, scare: ownerPose(show, 'scarecrow'), goose,
    bowlAt: SHOVED * ease(reached(atBowl, 'bowl', 'shoved')),
    sag: atLine?.thing === 'potato' ? ease(reached(atLine, 'line', 'sag')) : 0,
  }

  // The washing line, what hangs on it, and the prop that holds it up.
  const slid = atLine?.thing === 'potato' ? ease(reached(atLine, 'line', 'slideIn')) : 0
  let stirred = placeNudge(yard.stir.place.line) * 3
  for (const { act, k } of playingOf(atLine, 'line')) {
    if (act.does === 'gust') stirred += 0.2 * Math.sin(k * TAU * 1.8) * arch(k)
    if (act.does === 'chatter') stirred += 0.12 * Math.sin(k * TAU * 14)
    if (act.does === 'sag' || act.does === 'slideIn') stirred += 0.1 * Math.sin(k * TAU * 3) * (1 - k)
  }
  if (show.sending?.place === 'line' && SENDS.line.does === 'letSlide') stirred += 0.16 * Math.sin(show.sending.k * TAU * 4)
  pushLine(items, atLine, t, c.sag, slid, stirred)
  let knock = 0
  for (const { k } of playingOf(atLine, 'pole')) knock += 0.14 * Math.sin(k * TAU * 2) * (1 - k)
  items.push(as('pole', stamp('pole', SET.pole.x, SET.pole.y, knock, ROW_SCALE[0])))
  if (atLine && yard.moves[atLine.thing]?.kind !== 'whisk') {
    if (atLine.thing === 'cabbage') {
      // Its leaves unroll along the line one after another, and flutter.
      const unrolled = reached(atLine, 'flags', 'unroll'), flutters = playingOf(atLine, 'flags').some(({ act }) => act.does === 'flutter')
      FLAGS.forEach((u, i) => {
        if (unrolled * FLAGS.length <= i) return
        const at = lineAt(u, 0)
        items.push(as('flags', stamp('leaf', at.x, at.y + 12, Math.PI / 2 + (flutters ? 0.6 : 0.16) * Math.sin(t * (7 + i) + i * 1.3), 1.5)))
      })
    }
    const s = thingInPlace(c, atLine)
    if (s) items.push(s)
    if (atLine.thing === 'boot') {
      const flown = reached(atLine, 'sparrow', 'flyIn')
      if (flown > 0) {
        const k = ease(flown), tweets = playingOf(atLine, 'sparrow').find(({ act }) => act.does === 'tweet')
        const home = { x: HANG.x + 10, y: HANG.y - 56 }
        items.push(as('sparrow', stamp('sparrow', 900 + (home.x - 900) * k, 150 + (home.y - 150) * k - 40 * arch(flown) - (tweets ? 9 * arch(tweets.k * 2 % 1) : 0), flown < 1 ? 0.3 * Math.sin(flown * 40) : tweets ? -0.3 * arch(tweets.k) : 0, -1, 1)))
      }
      for (const { k } of playingOf(atLine, 'drip')) items.push(as('drip', stamp('drop', HANG.x - 24, HANG.y + 6 + 110 * k * k, 0, 1, 1, 1 - k * 0.4)))
    }
  }

  pushFarmer(items, yard, t)

  // The scarecrow, what he has been given, and his crow.
  const scarecrow = as('scarecrow', stamp('scarecrow', SET.scarecrow.x, SET.scarecrow.y + c.scare.dy, sway + c.scare.tilt))
  // His eyes turn up to the bare peg on his head, or to what is on it, until the raccoon comes near, and then follow it.
  const near = Math.hypot(watched.x - SET.scarecrow.x, watched.y - 300) < 260
  items.push(scarecrow, pupils(scarecrow, near ? watched : { x: SET.scarecrow.x + 20, y: 40 }))
  const atScarecrow = show.at.scarecrow
  if (atScarecrow && yard.moves[atScarecrow.thing]?.kind !== 'whisk') { const s = thingInPlace(c, atScarecrow); if (s) items.push(s) }
  const cawing = yard.poked === 'scarecrow' && !atScarecrow ? crowCaws(yard.stir.poke) : -1
  // Tickled, the scarecrow creaks and his crow caws: the same lift of the head as its caw at the boot hat.
  const crowPose = cawing >= 0 ? poseOf('crow', 'caw', cawing) : ownerPose(show, 'crow'), peck = cawing >= 0 ? { tilt: 0, lift: 0 } : crowPeck(t)
  const crowY = SET.crow.y + crowPose.dy + c.scare.dy
  const crow = as('crow', stamp('crow', SET.crow.x + crowPose.dx + (SET.scarecrow.y - crowY) * sway, crowY, crowPose.tilt + (busy(show, 'scarecrow', 'crow') ? 0 : peck.tilt * (atScarecrow ? 0.35 : 1)), crowPose.scale))
  items.push(crow, pupils(crow, watched))
  for (const { act, k } of playingOf(atScarecrow, 'leaves')) {
    if (act.does === 'drop') items.push(as('leaves', stamp('leaf', ON_HIM.head.x + 40 + 30 * k, ON_HIM.head.y - 20 + 230 * k * k, k * 7, 1.3, 1.3, 1 - k * k)))
  }

  // The nest, what lies in it, and the goose when a pairing has her on it.
  const tipped = show.sending?.place === 'nest' && SENDS.nest.does === 'tip' ? -0.5 * arch(show.sending.k) : 0
  items.push(as('nest', stamp('nest', SET.nest.x, SET.nest.y, placeNudge(yard.stir.place.nest) + tipped)))
  const atNest = show.at.nest
  if (atNest && yard.moves[atNest.thing]?.kind !== 'whisk') { const s = thingInPlace(c, atNest); if (s) items.push(s) }
  if (goose.layer === 'nest') pushGoose(items, yard, goose, raccoon)

  // The glow lies under what can be touched, and the gaze lies on the floor under every figure.
  const glow = guidance?.glow ?? 0
  if (glow > 0.01) for (const spot of glowSpots(yard)) items.push({ kind: 'glow', x: spot.x, y: spot.y, r: spot.r, alpha: glow })
  if (yard.watching) {
    // Every shape she sees by is drawn, and nothing else is seen: her wedge, and where she will land before and during a hop.
    const hot = yard.goose.mode === 'take' ? Math.min(1, yard.goose.t / 0.2) : 0
    for (const points of yard.gaze()) items.push({ kind: 'gaze', points, hot })
  }

  const aloft: Stamp[] = []
  for (let row = 0; row < ROWS.length; row++) {
    if (row === 3) pushPond(items, c, watched)
    // The goose stands in the groove she looks along, unless a pairing has her elsewhere or she is off her wire.
    if (goose.layer === 'groove' && goose.row === row) pushGoose(items, yard, goose, raccoon)
    const r = yard.raccoon
    if (!raccoon.flying && (r.mode === 'hop' ? Math.max(r.fromRow, r.toRow) : r.row) === row) pushRaccoon(items, yard, raccoon)
    // What lies about lies on the boards in front of the groove: behind it the figures of this groove, in front of it the next.
    for (const id of THINGS) {
      const loc = show.loc[id]
      if (loc.at !== 'floor' || loc.row !== row) continue
      const seen = thingSeen(yard, id, loc)
      const s = as(id, stamp(id, seen.x, seen.y, seen.tilt, seen.scale))
      if (seen.aloft) aloft.push(s)
      else items.push(s)
      // A cabbage that was set down lets one leaf slide off, as the rustle sounds.
      const move = yard.moves[id]
      const leaf = id === 'cabbage' && move?.kind === 'land' ? leafSlide(move.t) : null
      if (leaf) items.push(as('leaves', stamp('leaf', seen.x + leaf.dx * seen.scale, seen.y + leaf.dy * seen.scale, leaf.tilt, 1.2, 1.2, leaf.alpha)))
    }
    BUSHES.forEach((bush, i) => { if (bush.row === row) items.push(stamp('bush', bush.x, ROWS[row] + 10, bushShake(yard.stir.bush[i]), ROW_SCALE[row])) })
    if (row === 3) pushDog(items, c, watched)
  }

  // Whatever is off its wire or in the air goes over every groove.
  for (const id of THINGS) {
    const loc = show.loc[id]
    if (loc.at === 'air') { const seen = travelling(c, loc.travel); if (seen) aloft.push(as(id, stamp(id, seen.x, seen.y, seen.tilt, seen.scale))) }
    else if (yard.moves[id]?.kind === 'whisk' && loc.at !== 'floor') { const seen = thingSeen(yard, id); aloft.push(as(id, stamp(id, seen.x, seen.y, seen.tilt, seen.scale))) }
  }
  if (goose.layer === 'over') pushGoose(items, yard, goose, raccoon)
  items.push(...aloft)
  if (raccoon.flying) pushRaccoon(items, yard, raccoon)

  // Feathers from a plucked tail or a goose shot off her nest, and leaves from a bush crashed into or a cabbage torn: a second or so, then gone.
  // A goose tapped on her round ruffles: two feathers shake loose over her back as the ruffle sounds.
  const ruffle = gooseRuffle(yard.stir.ruffle)
  if (ruffle) for (let i = 0; i < 2; i++) items.push(as('feathers', stamp('feather', goose.x - goose.face * (30 + i * 26) + ruffle.dx * (i ? -1 : 1), goose.y - 96 - i * 14 + ruffle.dy, ruffle.tilt * (i ? -1 : 1), 1, 1, ruffle.alpha)))
  if (yard.stir.feather < 1.3) pushFeathers(items, yard.gooseNow().x - yard.gooseNow().face * 60, yard.gooseNow().y - 150, yard.stir.feather / 1.3)
  for (const { k } of playingOf(atNest, 'feathers')) pushFeathers(items, GOOSE_AT.nest.x, GOOSE_AT.nest.y - 150, k)
  for (const { k } of playingOf(atNest, 'leaves')) {
    for (let i = 0; i < 2; i++) items.push(as('leaves', stamp('leaf', SET.nest.x - 20 - (70 + i * 50) * k, SET.nest.y - 60 - 120 * arch(k) * (1 - i * 0.3) + 60 * k, k * 9 + i * 2, 1.3, 1.3, 1 - k * k)))
  }
  if (yard.stir.crash < 1) {
    const k = yard.stir.crash
    for (let i = 0; i < 4; i++) {
      const a = -2.6 + i * 0.7
      items.push(stamp('leaf', HOME.x + Math.cos(a) * 110 * k, ROWS[HOME.row] - 70 + Math.sin(a) * 90 * k + 150 * k * k, k * 9 + i, 1, 1, 1 - k))
    }
  }

  if (yard.peg) {
    const k = yard.peg.t
    // It drops in, wobbles and is pulled out again.
    const drop = k < 0.1 ? -30 * (1 - k / 0.1) : 0
    items.push(stamp('peg', yard.peg.x, yard.peg.y + 6 + drop, 0.3 * Math.exp(-k * 5) * Math.sin(k * 30), 1, 1, Math.min(1, (1.6 - k) / 0.3)))
  }
  if (yard.goose.mode === 'honk' || (yard.goose.mode === 'startled' && yard.goose.t < 0.5)) {
    const beak = eyesOf(stamp(goose.card, goose.x, goose.y, goose.tilt, goose.scale * (goose.flip < 0 ? -1 : 1), goose.scale))[0]
    if (beak) items.push({ kind: 'burst', x: beak.x + goose.face * 44 * goose.scale, y: beak.y + 12, face: goose.face, k: Math.min(1, yard.goose.t / 0.4) })
  }

  // An apple shaken out of the tree falls from where the finger was, in front of whatever stands before the tree.
  const apple = appleFall(yard.stir.apple)
  if (apple) items.push(stamp('apple', yard.toy.appleX, yard.toy.appleY + (APPLE_LANDS - yard.toy.appleY) * apple.k, apple.k * 5, 1, 1, apple.alpha))

  const rap = frameKnock(yard.stir.frame)
  pushProscenium(items, yard.stir.curtain, yard.toy.pelmet ? rap : 0, yard.toy.pelmet ? 0 : rap)

  if (guidance && guidance.demo !== null && !yard.scene && yard.tidy.t < 0) {
    const at = handTarget(yard)
    if (at) {
      handPose(guidance.demo, false, hand)
      const down = hand.press * 12
      items.push(stamp('hand', at.x + 14 - down, at.y + 14 - down, 0, 1 - hand.press * 0.06, 1 - hand.press * 0.06, hand.opacity))
    }
  }
  return items
}

/** The rope and the washing on it. With the potato on the line the rope hangs in a V and the washing has slid to the middle. */
function pushLine(items: Item[], atLine: CellNow | null, t: number, sag: number, slid: number, stirred: number): void {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i <= 10; i++) points.push(lineAt(i / 10, sag))
  items.push({ kind: 'rope', points })
  // The ball is a knee of the long johns, which swing with it.
  const knee = atLine?.thing === 'ball' ? actOf(atLine, 'thing') : null
  const kneeTilt = knee ? thingPose(knee.act.does, knee.k).tilt : 0
  SET.washing.forEach((piece, i) => {
    const at = lineAt(piece.u + (piece.slid - piece.u) * slid, sag)
    items.push(as('line', stamp(piece.card, at.x, at.y, washingSwing(i, t) + stirred * (i % 2 ? -1 : 1) + (i === 0 ? kneeTilt : 0), i === 3 ? -1 : 1, 1)))
  })
}

/** The farmer over his half-door: dozing, with one eye open at a noise or a tap, or out and whistling while he tidies. */
/** How far the half-door swings when the woken farmer pushes it ajar, as a part of fully open. */
export const DOOR_AJAR = 0.34

function pushFarmer(items: Item[], yard: Yard, t: number): void {
  const top = SET.farmer.y, tidy = yard.tidy
  let open = 0
  let farmer: Stamp
  if (tidy.t >= 0) {
    // The half-door bangs open, he slides out, and at the end he slides back in and it shuts.
    open = Math.min(clamp01(tidy.t / 0.1), clamp01((tidy.ends - tidy.t) / 0.25))
    const out = Math.min(clamp01((tidy.t - 0.08) / 0.24), clamp01((tidy.ends - tidy.t - 0.25) / 0.4))
    farmer = stamp('farmerUp', SET.farmer.x - 30 * ease(out), top + 22 * (1 - ease(out)), tidy.t >= WHISTLES_AT ? 0.06 * Math.sin(tidy.t * 9) : 0)
  } else if (tidy.awake > 0 || yard.stir.noise < NOISE_SECONDS) {
    // Awake: his hat is tipped back and one eye is open on the yard.
    const since = tidy.awake > 0 ? AWAKE_SECONDS - tidy.awake : yard.stir.noise
    farmer = stamp('farmerPeek', SET.farmer.x, top - 6 * arch(Math.min(1, since / 0.25)), 0)
    // Woken by a tap on his door, he pushes it ajar now and then and lets it fall shut: the door is what a second tap is for.
    if (tidy.awake > 0 && since >= AJAR.first) open = DOOR_AJAR * arch(((since - AJAR.first) % AJAR.every) / AJAR.seconds)
  } else {
    farmer = stamp('farmer', SET.farmer.x, top, farmerNod(t))
  }
  // A knock on the barn shakes the half-door on its hinge, and a farmer who is up jumps behind it.
  const shake = doorShake(yard.stir.knock)
  farmer.y -= 7 * Math.abs(shake)
  farmer.cutBelow = top
  items.push(as('farmer', farmer), as('door', stamp('halfDoor', DOOR.x + 4 * shake, top, 0.03 * shake, 1 - 0.86 * open, 1)))
}

/** The pond in the front groove: the lily pad, what floats or has sunk, the frog, and a goose that has bolted into it. */
function pushPond(items: Item[], c: Stage, watched: { x: number; y: number }): void {
  const { yard, show } = c, t = yard.time, now = show.at.pond
  items.push(stamp('lily', SET.lily.x, SET.lily.y))
  if (c.goose.layer === 'pond') pushGoose(items, yard, c.goose, raccoonSeen(yard))
  const pose = ownerPose(show, 'frog')
  const idle = !busy(show, 'pond', 'frog')
  const hop = idle && !now ? frogHop(t) : { lift: 0, tilt: 0 }
  const frog = as('frog', stamp(pose.card ?? 'frog', SET.frog.x + pose.dx, SET.frog.y + pose.dy + hop.lift, pose.tilt + hop.tilt + (idle ? placeNudge(yard.stir.place.pond) : 0), pose.scale))
  const thing = now && yard.moves[now.thing]?.kind !== 'whisk' ? thingInPlace(c, now) : null
  // He sits in the boot, and on anything else.
  const inside = now?.thing === 'boot'
  if (thing && !inside) items.push(thing)
  items.push(frog, pupils(frog, watched, pose.card === 'frogEars' || (idle && frogBlinks(t))))
  if (thing && inside) items.push(thing)
  const float = LOOKS.pond.ball
  for (const { act, k } of playingOf(now, 'bubble')) {
    if (act.does === 'rise') items.push(as('bubble', stamp('bubble', float.x + 6 * Math.sin(k * 9), 752 - 44 * k, 0, 0.6 + 0.4 * k)))
    else if (act.does === 'pop') items.push(as('bubble', stamp('bubble', float.x, 708, 0, 1 + 0.8 * k, 1 + 0.8 * k, 1 - k)))
    else items.push(as('bubble', stamp('bubble', float.x + (SET.frog.x - 6 - float.x) * ease(k), 708 - 26 * k - 20 * arch(k), 0, 1)))
  }
  // The small splash of a thing going in, and the great one of the goose, whatever the pond holds.
  for (const { act, k } of [...playingOf(now, 'splash'), ...playingOf(show.at.scarecrow, 'splash')]) {
    const great = act.does === 'great'
    items.push(as('splash', stamp('splash', great ? GOOSE_AT.pond.x : float.x, WATER, 0, (great ? 2 : 1) * (0.5 + 0.5 * arch(k)), (great ? 2.2 : 1) * arch(k), 1 - k * k)))
  }
  items.push(stamp('kennel', SET.kennel.x, SET.kennel.y))
}

/** The dog by his bowl, at the front of the front groove, with his tail, the bowl, what is in it, and the mound he buried the egg under. */
function pushDog(items: Item[], c: Stage, watched: { x: number; y: number }): void {
  const { yard, show } = c, t = yard.time, now = show.at.bowl
  const pose = ownerPose(show, 'dog'), wag = ownerPose(show, 'tail')
  const idle = !busy(show, 'bowl', 'dog')
  const nudge = placeNudge(yard.stir.place.bowl)
  const flip = thin(pose.flip)
  // His empty bowl licked, he leans over it with a low growl.
  const growl = yard.poked === 'bowl' && !now ? dogGrowl(yard.stir.poke) : 0
  const tilt = pose.tilt + (idle ? (growl ? growl : dogPant(t)) + nudge : 0)
  const x = SET.dog.x + pose.dx, y = SET.dog.y + pose.dy
  // His tail is fixed to him: it goes where he goes, round his feet as he tips.
  const ox = (SET.dogTail.x - SET.dog.x) * Math.sign(flip), oy = SET.dogTail.y - SET.dog.y
  items.push(as('tail', stamp('dogTail', x + ox * Math.cos(tilt) - oy * Math.sin(tilt), y + ox * Math.sin(tilt) + oy * Math.cos(tilt), tilt + (dogTail(t) + wag.tilt) * Math.sign(flip), Math.sign(flip), 1)))
  if (now?.thing === 'egg') {
    const heaped = reached(now, 'dog', 'noseOver')
    if (heaped > 0) items.push(stamp('mound', MOUND.x, MOUND.y, 0, 0.5 + 0.5 * heaped, 0.4 + 0.6 * heaped))
  }
  const dog = as('dog', stamp('dog', x, y, tilt, flip, 1))
  items.push(dog)
  if (Math.abs(flip) > 0.6 && Math.abs(tilt) < 1) items.push(pupils(dog, watched))
  items.push(as('bowl', stamp('bowl', SET.bowl.x + c.bowlAt, SET.bowl.y, nudge * 2)))
  // The empty bowl licked: the raccoon's tongue flicks two drops out of it.
  if (yard.poked === 'bowl' && !now) for (const drop of lickDrops(yard.stir.poke)) items.push(as('drip', stamp('drop', SET.bowl.x + drop.dx, SET.bowl.y - 22 + drop.dy, 0, 1, 1, drop.alpha)))
  if (now && yard.moves[now.thing]?.kind !== 'whisk') { const s = thingInPlace(c, now); if (s) items.push(s) }
  for (const { k } of playingOf(now, 'earth')) {
    for (let i = 0; i < 3; i++) { const j = (k * 3 + i / 3) % 1; items.push(as('earth', stamp('clod', MOUND.x - 30 - (40 + i * 26) * j, MOUND.y - 20 - 90 * arch(j), j * 8, 1, 1, 1 - j * j))) }
  }
  for (const { k } of playingOf(now, 'leaves')) {
    for (let i = 0; i < 3; i++) items.push(as('leaves', stamp('leaf', SET.bowl.x - (120 + i * 150) * k, SET.bowl.y - 30 - (50 + i * 30) * arch(k), k * 10 + i * 2, 1.3, 1.3, 1 - k * k)))
  }
  items.push(stamp('reeds', SET.reeds.x, SET.reeds.y, washingSwing(1, t * 0.7) * 0.6))
}

function pushFeathers(items: Item[], x: number, y: number, k: number): void {
  for (let i = 0; i < 3; i++) items.push(as('feathers', stamp('feather', x - i * 14 + Math.sin(k * 9 + i * 2) * 16, y + k * (110 + i * 22) - 60 * Math.sin(Math.min(1, k * 3) * Math.PI), Math.sin(k * 11 + i) * 0.8, 1, 1, 1 - k * k)))
}

/** The height an apple falls to: the foot of the fence, where it fades. */
const APPLE_LANDS = 420

/** How far the gilt frame jumps when it is knocked, away from the stage. */
export const FRAME_JUMPS = 18

/** How near the goose must be, along the yard, for the raccoon to keep its eyes on her and not on what it wants. */
export const GOOSE_MATTERS = 330

/**
 * Where the raccoon's eyes are: on the goose while she is alarmed or near it in its own groove or the next,
 * and otherwise on the thing that lies nearest, which is the one it wants; with a thing in its paws, on that.
 */
export function raccoonLooksAt(yard: Yard): { x: number; y: number } {
  const g = yard.gooseNow(), r = yard.raccoon
  const calm = yard.goose.mode === 'round' || yard.goose.mode === 'scene'
  if (!calm || (Math.abs(g.row - r.row) <= 1 && Math.abs(g.x - r.x) < GOOSE_MATTERS)) return { x: g.x, y: g.y - 150 }
  if (yard.carried()) { const held = inPaws(yard); return { x: held.x, y: held.y } }
  return handTarget(yard) ?? { x: g.x, y: g.y - 150 }
}

function pushRaccoon(items: Item[], yard: Yard, seen: ReturnType<typeof raccoonSeen>): void {
  const s = as('raccoon', stamp(seen.card, seen.x, seen.y + seen.sunk, seen.tilt, seen.scale * seen.face, seen.scale))
  // Sunk in a bush, nothing of it shows below the boards.
  if (seen.sunk > 0) s.cutBelow = ROWS[yard.raccoon.row] + 4
  if (!seen.flying) items.push({ kind: 'wire', x1: FLOOR.left - 30, y1: seen.y - 5, x2: seen.x - 50 * seen.scale, y2: seen.y - 5 })
  const carried = seen.flying ? null : yard.carried()
  if (carried) {
    const thing = inPaws(yard)
    items.push(as(carried, stamp(carried, thing.x, thing.y, thing.tilt, thing.scale)))
  }
  items.push(s)
  const dizzy = yard.raccoon.mode === 'dizzy' || seen.flying
  // Its eyes are on what it wants, or on the goose when she is near enough to matter; punted, they roll.
  items.push(pupils(s, dizzy ? { x: seen.x + Math.cos(yard.time * 18) * 50, y: seen.y - 60 + Math.sin(yard.time * 18) * 50 } : raccoonLooksAt(yard)))
}

function pushGoose(items: Item[], yard: Yard, seen: GooseSeen, raccoon: ReturnType<typeof raccoonSeen>): void {
  const s = as('goose', stamp(seen.card, seen.x, seen.y, seen.tilt, seen.scale * thin(seen.flip), seen.scale))
  if (seen.cut !== undefined) s.cutBelow = seen.cut
  if (seen.wire) items.push({ kind: 'wire', x1: seen.x + 56 * seen.scale, y1: seen.y - 5, x2: FLOOR.right + 30, y2: seen.y - 5 })
  items.push(s)
  if (!(EYES[seen.card] ?? []).length || Math.abs(seen.flip) < 0.6) return
  const far = { x: seen.x + seen.face * 300, y: seen.y - 60 }
  const mode = yard.goose.mode
  items.push(pupils(s, mode === 'round' || mode === 'relax' || mode === 'scene' ? far : { x: raccoon.x, y: raccoon.y - 60 }))
}

function pushProscenium(items: Item[], curtainStirred: number, pelmetKnock: number, apronKnock: number): void {
  const sway = curtainSway(curtainStirred)
  items.push(
    stamp('curtain', 0, SET.curtainY, sway),
    stamp('curtain', STAGE.width, SET.curtainY, -sway, -1, 1),
    stamp('pelmet', 0, SET.pelmetY - FRAME_JUMPS * pelmetKnock),
    stamp('apron', 0, SET.apronY + FRAME_JUMPS * apronKnock),
  )
}
