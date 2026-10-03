import type { Idea } from './cycle'
import type { Hair } from './hair'
import { COLLAR_Y, HEAD, STEP } from './layout'
import { PERSONALITIES } from './personality'
import { onHead, placesOf, tuftPose, tuftTip, type Actor, type Point } from './poses'
import type { Puppet } from './puppet'
import { TAIL_LEN } from './rules'
import type { Game } from './save'
import type { Beat } from './scene'
import type { Showing } from './showing'
import { DOORWAY, LOW, RIBBON_HOME, dipAt, lowFor, smooth, walk, type Staging } from './staging'
import { TASTES, type CustomerId } from './tastes'

// The short scenes, as lists of timed beats (scene.ts). Each is filled in
// from the state of play: who the two are, how long everything is, what the
// child just did. A scene's outcome is already in the game when its beats are
// made, so the beats only act it out; a scene that is cut short by a touch
// lands where the model has everything (`cast.cut` is set while that
// happens, and a beat that is only a sound or a start of something says
// nothing then).

/** A sound a scene asks for, by name. The game turns it into notes. */
export type Cue =
  | 'door' | 'doorShut' | 'step' | 'hatOff' | 'hairOut' | 'capeOn' | 'capeOff' | 'landed'
  | 'tooLong' | 'tooShort' | 'asLong' | 'flap' | 'air' | 'ping' | 'nip' | 'tug' | 'ribbonTaken' | 'ribbonTick' | 'ribbonHome'

export type Cast = {
  staging: Staging
  hair: Hair
  /** The two in the salon, and the pair on its way out. */
  customer(): Puppet | null
  friend(): Puppet | null
  cue(cue: Cue, who?: CustomerId): void
  /** A touch has ended the scene: beats land where they were going without starting anything. */
  readonly cut: boolean
}

const cueAt = (at: number, run: () => void): Beat => ({ at, lasts: 0, play: () => run() })
const over = (at: number, lasts: number, play: (progress: number) => void): Beat => ({ at, lasts, play })

/** Where a figure's tail hangs when it is held out straight to be measured. */
export const TAIL_OF_CUSTOMER: Point = { x: 300, y: 474 }
export function tailOf(actor: Actor): Point {
  return { x: actor.x + 72, y: actor.y + 98 }
}
/** Where the customer's paw comes out of the cape, on the far side from the friend. */
export const PAW_HOME: Point = { x: HEAD.x - 104, y: COLLAR_Y + 12 }
/** Where its paw comes from when the cape is off and it stands by the friend: its shoulder on the friend's side. */
export const SHOULDER: Point = { x: HEAD.x + 44, y: HEAD.y + HEAD.ry + 44 }
/** Where the friend stands by the ribbon's peg, and by the customer's tail. */
const BY_THE_PEG: Actor = { x: 772, y: 330, s: 0.65 }
const BY_THE_TAIL: Actor = { x: 232, y: 392, s: 0.65 }

/**
 * Coming in: the door swings, the pair that was done go out past the pair
 * that waited, who walk in each with its own gait; the rain hats pop off and
 * the hair springs out; the customer hops into the chair and the cape lands
 * on it; the friend takes its seat; the customer looks from its lock to the
 * friend's. `before` is the salon they come into, `after` the salon with them
 * in it.
 */
export function comingIn(cast: Cast, before: Game, after: Game): Beat[] {
  const { staging, hair } = cast
  const places = placesOf(after)
  if (!places.customer || !places.friend || after.chair === null || after.friend === null) return []
  const to = { customer: places.customer, friend: places.friend }
  const gait = { customer: PERSONALITIES[after.chair].gait, friend: PERSONALITIES[after.friend].gait }
  const old = placesOf({ ...before, cape: 'off' })
  const goers = before.chair !== null && before.friend !== null && old.customer && old.friend
    ? [{ who: before.chair, part: 'chair' as const, from: old.customer, lock: before.lock, mane: before.mane }, { who: before.friend, part: 'friend' as const, from: old.friend, lock: before.model, mane: null }]
      .map((goer) => ({ ...goer, worn: before.clippings.flatMap((c) => (c.on === 'face' && c.who === goer.part ? [{ spot: c.spot, len: c.len, hue: c.hue }] : [])) }))
    : []
  const WALK = 1.6, OUT = 0.9, BEHIND = 0.65
  // Along the back wall, a little above the straight way, when there is a pair going out to pass.
  const BACK = -40
  const beats: Beat[] = [
    cueAt(0, () => {
      // The ones who waited are in the doorway under their hats; the ones who were done set off.
      staging.waiting = 0
      staging.hats = 1
      staging.cape = 0
      staging.customer = { ...DOORWAY, x: DOORWAY.x - 22, lift: 0, seen: 0 }
      staging.friend = { ...DOORWAY, x: DOORWAY.x + 26, lift: 0, seen: 0 }
      staging.leaving = goers.map((goer) => ({ ...goer, at: { ...goer.from, lift: 0, seen: 1 } }))
      if (!cast.cut) cast.cue('door')
    }),
    over(0, 0.4, (p) => { staging.door = p }),
    // The pair that was done go out along the front of the floor, the friend first, past the pair coming in along the back.
    ...goers.map((goer) => over(goer.part === 'friend' ? 0.1 : 0.4, OUT, (p) => {
      const mine = staging.leaving.find((other) => other.part === goer.part)
      if (mine) mine.at = { ...walk(goer.from, { ...DOORWAY, s: 0.6 }, p, PERSONALITIES[goer.who].gait, OUT, goer.part === 'friend' ? LOW + 24 : LOW), seen: 1 - Math.max(0, (p - 0.8) / 0.2) }
      if (p >= 1 && goer.part === 'chair') staging.leaving = []
    })),
    // The customer leads the way in and the friend follows it, so each is seen whole.
    over(0.5, WALK, (p) => { staging.customer = { ...walk({ ...DOORWAY, x: DOORWAY.x - 22 }, to.customer, p, gait.customer, WALK, goers.length ? BACK : 0), seen: Math.min(1, p * 6) } }),
    over(0.5 + BEHIND, WALK - BEHIND, (p) => { staging.friend = { ...walk({ ...DOORWAY, x: DOORWAY.x + 26 }, to.friend, p, gait.friend, WALK - BEHIND, goers.length ? BACK : 0), seen: Math.min(1, p * 6) } }),
    cueAt(0.5 + WALK, () => { if (!cast.cut) { cast.cue('landed', after.chair ?? undefined); cast.customer()?.react('sitsDown'); cast.friend()?.react('sitsDown'); cast.customer()?.bump(1.2); cast.friend()?.bump(0.8) } }),
    cueAt(0.7 + WALK, () => {
      staging.hats = 0
      if (cast.cut) return
      hair.sprungOut()
      cast.cue('hatOff')
      cast.cue('hairOut')
      cast.customer()?.react('hatOff')
      cast.friend()?.react('hatOff')
    }),
    cueAt(1.0 + WALK, () => { if (!cast.cut) cast.cue('capeOn') }),
    over(1.0 + WALK, 0.45, (p) => { staging.cape = p }),
    cueAt(1.3 + WALK, () => { if (!cast.cut) cast.cue('doorShut') }),
    over(1.3 + WALK, 0.35, (p) => { staging.door = 1 - p; staging.waiting = p }),
    // The one want, always visible: the customer looks from its lock to the friend's, and the friend holds its own out.
    cueAt(1.7 + WALK, () => { if (!cast.cut) { cast.customer()?.react('wantsItSo'); cast.friend()?.react('wantsItSo') } }),
    // And pats its own lock, twice, with a paw from under the cape.
    over(1.7 + WALK, Math.max(1, cast.customer()?.lasts('wantsItSo') ?? 1), (p) => {
      const lock = places.lock, out = smooth(Math.min(1, p / 0.3, (1 - p) / 0.3))
      staging.paw = p >= 1 || !lock ? null : { x: PAW_HOME.x + (lock.x - 4 - PAW_HOME.x) * out, y: PAW_HOME.y + (lock.y + 44 - PAW_HOME.y) * out - Math.abs(Math.sin(p * Math.PI * 2)) * 8 * out, scissors: null }
    }),
  ]
  return beats
}

/**
 * The cape comes off: it flies up and lands over the chair, the customer hops
 * down, the friend comes over, they stand cheek to cheek with the two locks
 * side by side, look down at the free ends, and the customer does what it
 * does about a lock that is too long, too short or as long, sized by the
 * piece or the gap; then about its mane, its bow and whatever it wears.
 */
export function capeComesOff(cast: Cast, before: Game, after: Game, showing: Showing): Beat[] {
  const { staging, hair } = cast
  const from = placesOf(before), to = placesOf(after)
  if (!to.customer || !to.friend || after.chair === null || after.friend === null) return []
  const chair = after.chair, friend = after.friend, taste = TASTES[chair]
  const friendFrom = from.friend ?? to.friend, friendTo = to.friend
  const far = friendFrom.x !== friendTo.x
  const customer = cast.customer(), other = cast.friend()
  const kind = showing.comparison.kind, big = 0.5 + showing.comparison.muddle
  const beats: Beat[] = [
    cueAt(0, () => { staging.fx = null; if (!cast.cut) { cast.cue('capeOff'); customer?.react('hopsOver') } }),
    over(0, 0.5, (p) => { staging.cape = 1 - p }),
    over(0.3, far ? 1.2 : 0.3, (p) => { staging.friend = far ? walk(friendFrom, friendTo, p, PERSONALITIES[friend].gait, 1.2, lowFor(friendFrom, friendTo)) : { ...friendTo, lift: 0, seen: 1 } }),
    cueAt(far ? 1.5 : 0.6, () => { if (!cast.cut) { other?.react('hopsOver'); cast.cue('landed', friend) } }),
    // Both look down at the two free ends.
    cueAt(1.7, () => { if (!cast.cut) { customer?.react('floorWatched'); other?.react('floorWatched') } }),
  ]
  // The customer's paw acts out the comparison on the two ends themselves, sized by the piece or the gap.
  const lock = to.lock ?? { x: 0, y: 0, unit: STEP }
  const lockEnd = lock.y + after.lock * lock.unit, modelEnd = lock.y + after.model * lock.unit
  const times = kind === 'too-short' ? 2 + Math.round(showing.comparison.muddle * 2) : 3 + Math.round(showing.comparison.muddle * 4)
  const paw = (x: number, y: number): void => { staging.paw = { x, y, scissors: null } }
  const reach = (p: number, x: number, y: number): void => paw(SHOULDER.x + (x - SHOULDER.x) * smooth(p), SHOULDER.y + (y - SHOULDER.y) * smooth(p))
  const reaction = kind === 'too-long' ? 'lockTooLong' as const : kind === 'too-short' ? 'lockTooShort' as const : 'lockAsLong' as const
  let t = 2.5
  if (kind === 'too-long') {
    // It takes hold of its lock level with the friend's end. The piece below its paw is the piece things happen to: it flaps about, the bigger the wilder.
    const flap = 0.36
    beats.push(
      over(2.1, 0.4, (p) => reach(p, lock.x - 2, modelEnd)),
      cueAt(2.5, () => { staging.fx = { kind, muddle: showing.comparison.muddle }; if (!cast.cut) { customer?.react(reaction); cast.cue('tooLong', chair) } }),
      ...Array.from({ length: times }, (_, i) => cueAt(2.5 + i * flap, () => { if (!cast.cut) { hair.kicked('lock', (i % 2 ? -1 : 1) * 7 * big); if (i > 0) cast.cue('flap', chair) } })),
      over(2.5, times * flap, (p) => paw(lock.x - 2 + Math.sin(p * times * Math.PI) * 5, modelEnd)),
    )
    // And then it treads on it: its head goes down with a bump, its mane droops, and the friend cannot keep a straight face.
    beats.push(cueAt(2.5 + times * flap, () => { if (!cast.cut) { customer?.bump(1.4); hair.moodOf('droop', 1.3); hair.kicked('lock', 9 * big); other?.react('friendRuffled'); cast.cue('landed', chair) } }))
    t = 2.5 + times * flap
  } else if (kind === 'too-short') {
    // It takes its lock by the end, feels on down for hair as far as the friend's end, and finds air; then the friend's longer end flicks over at it.
    const grab = 0.36, feel = 0.7
    beats.push(
      over(2.1, 0.4, (p) => reach(p, lock.x, lockEnd)),
      cueAt(2.5, () => { staging.fx = { kind, muddle: showing.comparison.muddle }; if (!cast.cut) cast.cue('tooShort', chair) }),
      over(2.5, feel, (p) => paw(lock.x, lockEnd + (modelEnd - lockEnd) * smooth(p))),
      ...Array.from({ length: times }, (_, i) => cueAt(2.5 + feel + i * grab, () => { if (!cast.cut) cast.cue('air', chair) })),
      over(2.5 + feel, times * grab, (p) => paw(lock.x + Math.sin(p * times * Math.PI * 2) * 10, modelEnd - Math.abs(Math.sin(p * times * Math.PI)) * 14)),
    )
    // Then it takes its lock by the end and draws it down to see if it will reach. It will, and it will not stay: hair that is
    // not under the cape springs back, with a ping, and the friend's longer end flicks over at it.
    const draw = 2.5 + feel + times * grab, gap = after.model - after.lock
    beats.push(
      over(draw, 0.2, (p) => paw(lock.x, modelEnd + (lockEnd - modelEnd) * smooth(p))),
      over(draw + 0.2, 0.45, (p) => { staging.stretch = gap * smooth(p); paw(lock.x, lockEnd + (modelEnd - lockEnd) * smooth(p)) }),
      cueAt(draw + 0.65, () => {
        staging.stretch = 0
        if (cast.cut) return
        hair.strands.lock.stretch.x = after.model / Math.max(1, after.lock)
        hair.strands.lock.stretch.v = -4
        cast.cue('ping', chair)
        customer?.bump(1.3)
        customer?.react(reaction)
        other?.react('friendPoked')
        hair.kicked('model', -7 * big)
      }),
    )
    t = draw + 0.65
  } else {
    // The two ends meet in its paw, and the two locks swing as one.
    beats.push(
      over(2.1, 0.4, (p) => reach(p, lock.x + 18, modelEnd)),
      cueAt(2.5, () => { staging.fx = { kind, muddle: showing.comparison.muddle }; if (!cast.cut) { customer?.react(reaction); other?.react(reaction); cast.cue('asLong', chair) } }),
      over(2.5, 0.5, () => paw(lock.x + 18, modelEnd)),
      cueAt(3.0, () => { if (!cast.cut) { hair.strands.lock.swing.v = 2.4; hair.strands.model.swing.v = 2.4; hair.moodOf('wave', 1.4); customer?.bump(0.7); other?.bump(0.7) } }),
    )
    t = 3.0
  }
  // The paw goes home while the customer does what it does about it.
  const lets = t
  beats.push(over(lets, 0.3, (p) => { const from = staging.paw ?? { x: SHOULDER.x, y: SHOULDER.y }; if (p >= 1) staging.paw = null; else paw(from.x + (SHOULDER.x - from.x) * p * 0.5, from.y + (SHOULDER.y - from.y) * p * 0.5) }))
  t += Math.max(customer?.lasts(reaction) ?? 1.2, 1.2) + 0.3
  beats.push(over(lets, t - lets, () => {}))
  // Then its tastes: its mane, its bow, and whatever it wears.
  if (showing.mane !== 'plain') {
    const reaction = showing.mane === 'liked' ? 'maneLiked' as const : 'maneHated' as const
    const at = t
    beats.push(cueAt(at, () => { if (!cast.cut) { customer?.react(reaction); hair.moodOf(showing.mane === 'liked' ? 'wave' : 'droop', 1.4) } }), over(at, (customer?.lasts(reaction) ?? 1) + 0.2, () => {}))
    t += (customer?.lasts(reaction) ?? 1) + 0.2
  }
  if (showing.bow !== null) {
    const reaction = taste.bow === 'loves' ? 'bowLoved' as const : 'bowHated' as const
    const at = t
    beats.push(cueAt(at, () => { if (!cast.cut) customer?.react(reaction) }), over(at, (customer?.lasts(reaction) ?? 1) + 0.2, () => {}))
    t += (customer?.lasts(reaction) ?? 1) + 0.2
  }
  if (showing.blindfold !== null || showing.worn.chair > 0 || showing.worn.friend > 0) {
    const at = t
    beats.push(cueAt(at, () => {
      if (cast.cut) return
      if (showing.blindfold === 'chair') customer?.react('blindfolded')
      else if (showing.worn.chair > 0) customer?.react('wearing')
      if (showing.blindfold === 'friend') other?.react('blindfolded')
      else if (showing.worn.friend > 0) other?.react('wearing')
    }), over(at, 1.1, () => {}))
    t += 1.1
  }
  // They settle, side by side, with the haircut on show.
  beats.push(cueAt(t, () => { staging.fx = null; staging.paw = null; staging.stretch = 0; staging.cape = 0; staging.friend = { ...friendTo, lift: 0, seen: 1 } }))
  return beats
}

/**
 * A thing shown once, on something that is not the problem in front of the
 * child. The snip: the customer nips the longest tuft of its own mane to half
 * its length. The pull: it tugs the shortest tuft longer. The ribbon: the
 * friend takes it from its peg, pulls it until it is as long as its own
 * tail, trots over, holds it beside the customer's tail, and hangs it back.
 * `before` is the game before the showing was marked and `after` the game
 * after, which already holds everything the showing changes.
 */
export function shownOnce(cast: Cast, idea: Idea, before: Game, after: Game): Beat[] {
  const { staging, hair } = cast
  const places = placesOf(after)
  if (!places.customer || !places.friend || after.chair === null || after.friend === null) return []
  const chair = after.chair, friend = after.friend
  if (idea === 'ribbon') {
    const home = places.friend, gait = PERSONALITIES[friend].gait
    const tail = tailOf(BY_THE_PEG), beside = { x: TAIL_OF_CUSTOMER.x + 30, y: TAIL_OF_CUSTOMER.y }
    const stand = (a: Actor) => ({ ...a, lift: 0, seen: 1 })
    return [
      cueAt(0, () => { staging.ribbon = { x: RIBBON_HOME.x, y: RIBBON_HOME.y, len: 16 }; if (!cast.cut) cast.friend()?.react('showsAMove') }),
      over(0, 1.0, (p) => { staging.friend = walk(home, BY_THE_PEG, p, gait, 1.0, lowFor(home, BY_THE_PEG)) }),
      cueAt(1.0, () => { if (!cast.cut) cast.cue('ribbonTaken') }),
      // It holds the ribbon beside its own tail, and pulls it until it is as long as the tail.
      over(1.0, 0.5, (p) => { staging.tails = p; staging.ribbon = { x: RIBBON_HOME.x + (tail.x - 30 - RIBBON_HOME.x) * p, y: RIBBON_HOME.y + (tail.y - RIBBON_HOME.y) * p, len: 16 } }),
      over(1.5, 1.1, (p) => {
        const len = Math.round(16 + (TAIL_LEN - 16) * p)
        if (!cast.cut && staging.ribbon && len !== staging.ribbon.len && len % 4 === 0) cast.cue('ribbonTick')
        staging.ribbon = { x: tail.x - 30, y: tail.y, len }
      }),
      cueAt(2.6, () => { if (!cast.cut) cast.friend()?.react('holdsBreath') }),
      // It trots over and holds it beside the customer's tail.
      over(2.8, 1.1, (p) => {
        // Round the front of the chair, with the ribbon in its paw all the way.
        staging.friend = walk(BY_THE_PEG, BY_THE_TAIL, p, gait, 1.1, LOW)
        const along = smooth(p)
        staging.ribbon = { x: tail.x - 30 + (beside.x - tail.x + 30) * along, y: tail.y + (beside.y - tail.y) * along + (p >= 1 ? 0 : LOW * dipAt(p)), len: TAIL_LEN }
      }),
      cueAt(3.9, () => { if (!cast.cut) { cast.customer()?.react('wantsItSo'); cast.cue('landed', friend) } }),
      over(3.9, 1.0, () => { staging.ribbon = { x: beside.x, y: beside.y, len: TAIL_LEN } }),
      // And hangs it back on its peg, where it is from then on.
      over(4.9, 1.0, (p) => {
        staging.friend = walk(BY_THE_TAIL, BY_THE_PEG, p, gait, 1.0, LOW)
        const along = smooth(p)
        staging.ribbon = { x: beside.x + (RIBBON_HOME.x - beside.x) * along, y: beside.y + (RIBBON_HOME.y - beside.y) * along + (p >= 1 ? 0 : LOW * dipAt(p)), len: TAIL_LEN }
        staging.tails = 1 - p
      }),
      cueAt(5.9, () => { staging.ribbon = null; staging.tails = 0; if (!cast.cut) cast.cue('ribbonHome') }),
      over(5.9, 1.0, (p) => { staging.friend = p >= 1 ? stand(home) : walk(BY_THE_PEG, home, p, gait, 1.0, lowFor(BY_THE_PEG, home)) }),
    ]
  }

  // The tuft the customer showed the move on: the one whose length the showing changed.
  const tuft = after.mane.findIndex((steps, i) => steps !== before.mane[i])
  if (tuft < 0) return [over(0, 0.3, () => {})]
  const was = before.mane[tuft], is = after.mane[tuft]
  const reach = (steps: number): number => tuftPose(chair, tuft, steps, after.mane.length).reach
  const share = reach(was) / reach(is)
  const tip = (): Point => onHead({ x: HEAD.x, y: HEAD.y, s: 1 }, tuftTip(tuftPose(chair, tuft, is, after.mane.length)))
  const held = hair.tufts[tuft]
  // The paw comes out of the cape on the far side from the friend and goes to the tuft, a good way along it.
  const head = { x: HEAD.x, y: HEAD.y, s: 1 }
  const along = (steps: number): Point => { const pose = tuftPose(chair, tuft, steps, after.mane.length), end = tuftTip(pose); return onHead(head, { x: pose.base.x + (end.x - pose.base.x) * 0.7, y: pose.base.y + (end.y - pose.base.y) * 0.7 }) }
  const grip = along(was), drawn = along(is)
  const pawAt = (p: number): { x: number; y: number; scissors: number | null } => {
    const reach = smooth(Math.min(1, p / 0.5)), tug = idea === 'pull' ? Math.max(0, (p - 0.5) / 0.5) : 0
    const to = { x: grip.x + (drawn.x - grip.x) * tug, y: grip.y + (drawn.y - grip.y) * tug }
    // It goes out round the side of the face, never across the eyes.
    const round = { x: HEAD.x - HEAD.rx - 90, y: (PAW_HOME.y + to.y) / 2 }, a = (1 - reach) * (1 - reach), b = 2 * reach * (1 - reach), c = reach * reach
    return { x: a * PAW_HOME.x + b * round.x + c * to.x, y: a * PAW_HOME.y + b * round.y + c * to.y, scissors: idea === 'snip' ? (p > 0.92 ? 0 : 1) : null }
  }
  return [
    cueAt(0, () => {
      // The tuft is drawn as long as it was until the paw has done its work.
      if (held) { held.rest = share; held.stretch.x = share; held.stretch.v = 0 }
      staging.paw = pawAt(0)
      // The mane does not like the look of scissors, whoever holds them.
      if (!cast.cut && idea === 'snip') hair.scared = true
      if (!cast.cut) cast.customer()?.react('showsAMove')
    }),
    over(0, 1.5, (p) => {
      staging.paw = pawAt(p)
      // A tug draws the tuft out as the paw goes; a nip leaves it until the blades close.
      if (idea === 'pull' && held) held.rest = share + (1 - share) * Math.max(0, (p - 0.5) / 0.5)
    }),
    cueAt(idea === 'pull' ? 0.75 : 1.5, () => { if (!cast.cut) cast.cue(idea === 'snip' ? 'nip' : 'tug', chair) }),
    cueAt(1.5, () => {
      if (held) held.rest = 1
      hair.scared = false
      if (idea === 'snip' && !cast.cut) { hair.tuftSnipped(tuft, tip(), '#f0c9a0'); cast.customer()?.bump(0.8) }
    }),
    // It holds the tuft up a moment to be seen, and goes back under the cape.
    over(1.5, 0.5, () => { staging.paw = pawAt(1) }),
    over(2.0, 0.4, (p) => { const end = pawAt(1); staging.paw = p >= 1 ? null : { x: end.x + (PAW_HOME.x - end.x) * smooth(p), y: end.y + (PAW_HOME.y - end.y) * smooth(p), scissors: end.scissors === null ? null : 1 } }),
  ]
}
