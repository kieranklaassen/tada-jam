import * as cells from './cellVoices'
import { voiceKindOf } from './cellVoices'
import { bowlOf, fillLevel } from './forms'
import { callPot, carry, pickUp, pressPot, putDown, releasePot, type HandEvent } from './hands'
import { markShown, nextSitting, placeOf, showerOf, type Game, type GameEvent } from './host'
import { TRAY } from './layout'
import { LIKES, type Showing } from './party'
import type { Beat } from './scene'
import { SENT_EVERY, SENT_FIRST, type Stage } from './stage'
import { SPOON_REACH, cupOf, drink, twinOf, type Lift } from './tastes'
import * as voices from './voices'
import type { VoiceSpec } from './voices'
import type { GuestId } from './world'

// The short scenes, each a list of timed beats (scene.ts) filled in from the
// state of play. Every scene puts its outcome into the world when it is
// built, which is when it starts, so a put-away at any moment of it loses
// nothing and nothing plays again on load. A beat that is ended early lands
// where it was going; a sound whose moment has not come is not played late.

/** What a scene needs of the game that plays it. */
export type Cast = {
  readonly game: Game
  readonly stage: Stage
  /** The attended clock, in seconds. */
  now: number
  say(voice: VoiceSpec): void
  saved(soon: 0 | 1 | 2): void
  /** A showing is about to play: the table as it stands now is what is stored until the showing is over. */
  found(): void
  showTable(atOnce: boolean): void
  heard(events: readonly (GameEvent | HandEvent)[]): void
  readonly lastHad: Partial<Record<GuestId, number>>
}

const ease = (t: number) => t * t * (3 - 2 * t)

/** How full a guest likes its cup, as a level: the pitch its cup clinks at when the game does not remember how full the child made it, after it was put away and opened. */
function likes(who: GuestId): number {
  return fillLevel(bowlOf('house'), (LIKES as Partial<Record<GuestId, number>>)[who] ?? 0.5)
}

/**
 * Where a Duckling holds its cup out to its twin's: halfway between their two
 * places, a little toward themselves, where the pot never stands, and lifted
 * clear of the table, the two rims side by side and all but touching, so
 * both amounts are seen at once.
 */
function rimToRim(game: Game, who: GuestId, twin: GuestId, cupId: string): { x: number; y: number; z: number } {
  const mine = placeOf(game, who), theirs = placeOf(game, twin)
  const cup = game.world.things.find((thing) => thing.id === cupId)
  const rim = bowlOf(cup ? cup.size : 'house').rimR + 0.05
  return { x: (mine.x + theirs.x) / 2 + (mine.x < theirs.x ? -rim : rim), y: 1.15, z: mine.z - 1.05 }
}

/** The beats of one scene, timed from the moment it was built, or from `after` seconds later for a scene that follows another in one list. */
function script(cast: Cast, after = 0) {
  const from = cast.now + after
  const beats: Beat[] = []
  return {
    beats,
    /** Something that takes time; at 1 it leaves everything where it was taking it. */
    span(at: number, lasts: number, play: (progress: number) => void): void {
      beats.push({ at: at + after, lasts, play })
    },
    /** Something that changes the world or the stage: it happens at its moment, or when a touch ends the scene. */
    cue(at: number, run: () => void): void {
      beats.push({ at: at + after, lasts: 0, play: run })
    },
    /** A sound: it is heard at its moment, and not at all if a touch ended the scene first. */
    sound(at: number, voice: () => VoiceSpec): void {
      beats.push({ at: at + after, lasts: 0, play: () => { if (cast.now >= from + at - 0.03) cast.say(voice()) } })
    },
  }
}

/**
 * A guest lifts its cup and does what that much tea brings. The rules have
 * already noted what it found and, if it drinks, emptied the cup: the stage
 * shows the tea that was there going down.
 */
export function sip(cast: Cast, who: GuestId, cup: string, lift: Lift, had: number, licked: number): Beat[] {
  const { stage } = cast
  const kind = voiceKindOf(who)
  const s = script(cast)
  stage.guestLook(who, null)
  const down = (at: number) => {
    s.span(at, 0.5, (p) => stage.hold(cup, who, 1 - ease(p), 0))
    s.cue(at + 0.5, () => {
      stage.hold(cup, null, 0, 0)
      stage.showTea(cup, null)
      stage.nudge(cup, 0.06)
    })
    s.sound(at + 0.5, () => cells.seatClink)
  }
  const twin = twinOf(who)
  if (twin && (lift.details.includes('twin-has-more') || lift.details.includes('twin-has-less'))) {
    // Two cups that are not the same: each Duckling holds its cup out to the other's, rim to rim, and the one with
    // less looks from its cup to its twin's and back. Both cups stay as they are.
    const less = lift.details.includes('twin-has-more')
    const across = placeOf(cast.game, twin)
    const meet = rimToRim(cast.game, who, twin, cup)
    stage.guestDo(who, 'show')
    s.span(0.2, 0.6, (p) => stage.hold(cup, who, ease(p), 0, meet))
    s.sound(1.0, () => (less ? cells.shortCall(kind) : cells.overCall(kind)))
    if (less) {
      for (const at of [0.9, 1.9]) {
        s.cue(at, () => stage.guestLook(who, across))
        s.cue(at + 0.5, () => stage.guestLook(who, null))
      }
    }
    s.span(2.6, 0.5, (p) => stage.hold(cup, who, 1 - ease(p), 0, meet))
    s.cue(3.1, () => {
      stage.hold(cup, null, 0, 0)
      stage.guestLook(who, null)
    })
    return s.beats
  }
  if (lift.taste === 'right') {
    stage.guestDo(who, 'sip-right')
    // The Hen stirs her tea with her spoon before she drinks: the spoon goes into the cup and round, and the tea turns.
    const stirs = who === 'hen' ? 1.2 : 0
    if (stirs > 0) {
      const place = placeOf(cast.game, who)
      const spoon = cast.game.world.things.find((thing) => thing.kind === 'spoon' && thing.heldBy === null && thing.on !== cup && Math.hypot(thing.x - place.x, thing.z - place.z) <= SPOON_REACH)
      if (spoon) stage.act(spoon.id, 'stir')
      stage.act(cup, 'whirl')
      for (const at of [0.3, 0.55, 0.8]) s.sound(at, () => cells.stirTing(Math.round(at * 20)))
    } else if (lift.details.includes('spoon-in-cup')) s.sound(0.05, () => cells.stirTing(1))
    s.cue(0, () => stage.showTea(cup, had))
    s.span(stirs, 0.5, (p) => stage.hold(cup, who, ease(p), 0))
    s.sound(stirs + 0.5, () => cells.sipCall(kind))
    s.span(stirs + 0.5, 1.7, (p) => {
      stage.hold(cup, who, 1, 0.8 * Math.sin(Math.min(1, p * 1.2) * Math.PI * 0.5))
      stage.showTea(cup, had * (1 - p))
    })
    down(stirs + 2.2)
    // The Bear licks up what ran into his saucer: he bends to it when his cup is down, and the pool goes as he laps.
    const saucer = licked > 0 ? cast.game.world.things.find((thing) => thing.id === cup)?.on ?? null : null
    if (saucer) {
      s.cue(0, () => stage.showTea(saucer, licked))
      s.cue(stirs + 2.9, () => stage.guestDo(who, 'reach'))
      s.sound(stirs + 3.0, () => cells.slurp(3))
      s.span(stirs + 3.0, 0.8, (p) => stage.showTea(saucer, licked * (1 - p)))
      s.cue(stirs + 3.8, () => stage.showTea(saucer, null))
    }
  } else if (lift.taste === 'short') {
    stage.guestDo(who, 'sip-short')
    s.cue(0, () => stage.showTea(cup, had))
    s.span(0, 0.5, (p) => stage.hold(cup, who, ease(p), 0))
    // Tipped right back for the one drop that is in it.
    s.span(0.5, 0.8, (p) => {
      stage.hold(cup, who, 1, 1.25 * Math.sin(Math.min(1, p * 1.5) * Math.PI * 0.5))
      if (lift.drinks) stage.showTea(cup, had * (1 - p))
    })
    // The one drop falls from the tipped cup onto its tongue.
    s.cue(0.9, () => stage.splash(cup, 0, 1))
    s.sound(0.9, () => voices.plip(0))
    s.sound(1.05, () => cells.shortCall(kind))
    if (lift.details.includes('cup-too-small')) {
      // A cup too small for it is drained in that one lick: it peers in, and holds the cup out again.
      const place = placeOf(cast.game, who)
      const out = { x: place.x, y: 0.95, z: place.z + 0.95 }
      s.span(1.3, 0.45, (p) => stage.hold(cup, who, 1, 1.25 * (1 - ease(p))))
      s.span(1.75, 0.4, (p) => stage.hold(cup, who, ease(p), 0, out))
      s.sound(2.1, () => cells.waitCall(kind))
      s.span(2.9, 0.4, (p) => stage.hold(cup, who, 1 - ease(p), 0, out))
      s.cue(3.3, () => {
        stage.hold(cup, null, 0, 0)
        stage.showTea(cup, null)
        stage.nudge(cup, 0.06)
      })
      s.sound(3.3, () => cells.seatClink)
    } else down(1.3)
  } else if (who === 'mouse' && lift.details.includes('brimful')) {
    // A cup full to the brim is more than the Mouse can lift at all: she climbs up on tiptoe and looks over its rim.
    stage.guestDo(who, 'show')
    s.cue(0, () => stage.guestLook(who, placeOf(cast.game, who)))
    s.sound(0.3, () => cells.overCall(kind))
    s.cue(2.0, () => stage.guestLook(who, null))
  } else {
    stage.guestDo(who, 'sip-over')
    // Too heavy to lift far: it gets halfway and wobbles.
    s.span(0, 0.6, (p) => stage.hold(cup, who, 0.45 * ease(p), 0))
    s.span(0.6, 0.9, (p) => stage.hold(cup, who, 0.45, 0.28 * Math.sin(p * Math.PI * 5) * (1 - p)))
    s.sound(0.8, () => cells.overCall(kind))
    s.sound(1.0, () => voices.patter(2))
    // The mishap is the tea's own: the Hen's beak blows bubbles in it, and it slops out of anyone else's cup in drops.
    if (who === 'hen') for (const at of [0.5, 0.7, 0.9, 1.1, 1.3]) s.cue(at, () => stage.splash(cup, 0, 0))
    else s.cue(1.0, () => stage.splash(cup, 0.5, 4))
    s.span(1.5, 0.5, (p) => stage.hold(cup, who, 0.45 * (1 - ease(p)), 0))
    s.cue(2.0, () => stage.hold(cup, null, 0, 0))
  }
  return s.beats
}

/**
 * A guest shows a new idea once, inside the fiction and without a word,
 * before the child tries it. Its mark is stored as the scene is built, so it
 * never plays again. It is never the answer to the cup in front of the
 * child: whatever it does to the table, it undoes.
 */
export function showing(cast: Cast, idea: Showing, after = 0): Beat[] {
  const { game, stage } = cast
  markShown(game, idea)
  // It leaves the table as it finds it: what is stored while it plays is the table as it is now.
  cast.found()
  const who = showerOf(game, idea)
  const kind = voiceKindOf(who)
  const s = script(cast, after)
  const cup = cupOf(game.world, who, placeOf(game, who))
  s.cue(0, () => stage.guestDo(who, 'show'))
  if (idea === 'pour' && cup) {
    // The pot comes to the Bear's cup and pours a splash for as long as he points; he drinks the splash, and the cup is empty again.
    s.cue(0, () => stage.guestLook(who, game.pot))
    s.cue(0.5, () => cast.heard(callPot(game, { id: cup.id, guest: null, spot: cup })))
    s.cue(1.4, () => cast.heard(pressPot(game)))
    s.cue(2.1, () => cast.heard(releasePot(game)))
    let splash = 0
    s.cue(2.7, () => {
      splash = cup.tea
      drink(game.world, cup.id)
      game.lastTea[cup.id] = 0
      stage.showTea(cup.id, splash)
      stage.guestDo(who, 'reach')
    })
    s.span(2.7, 0.4, (p) => stage.hold(cup.id, who, ease(p), 0))
    s.sound(3.1, () => cells.sipCall(kind))
    s.span(3.1, 0.9, (p) => {
      stage.hold(cup.id, who, 1, 0.8 * Math.sin(p * Math.PI * 0.5))
      stage.showTea(cup.id, splash * (1 - p))
    })
    s.span(4.0, 0.4, (p) => stage.hold(cup.id, who, 1 - ease(p), 0))
    s.cue(4.4, () => {
      stage.hold(cup.id, null, 0, 0)
      stage.showTea(cup.id, null)
      stage.guestLook(who, null)
    })
  } else if (idea === 'lay' && cup) {
    // The guest fetches a saucer and sets its cup on it, then puts the saucer back and holds its cup out again: the laying is the child's.
    s.cue(0, () => stage.guestLook(who, TRAY.saucers))
    let saucer: string | null = null
    // Where the pot stands, to send it back there: it goes with the cup to the saucer and must come back with it.
    const stood = { x: game.pot.hop ? game.pot.hop.toX : game.pot.x, z: game.pot.hop ? game.pot.hop.toZ : game.pot.z, heading: game.pot.hop ? game.pot.hop.toHeading : game.pot.heading, reach: game.pot.reach, over: game.pot.over }
    s.cue(0.7, () => {
      saucer = pickUp(game, game.world.things.find((thing) => thing.kind === 'saucer' && thing.on === null && Math.hypot(thing.x - TRAY.saucers.x, thing.z - TRAY.saucers.z) < 0.05)?.id ?? '')
      if (!saucer) return
      carry(game, placeOf(game, who))
      cast.heard(putDown(game, placeOf(game, who), null))
    })
    s.cue(2.6, () => {
      // Whatever came of it, the saucer goes back on the stack and the cup back in the paw.
      if (!saucer) return
      if (cup.on === saucer) Object.assign(cup, { on: null, heldBy: who, worn: false })
      if (pickUp(game, saucer) !== null) {
        carry(game, TRAY.saucers)
        cast.heard(putDown(game, TRAY.saucers, null))
      }
      const pot = game.pot
      const to = pot.hop ? { x: pot.hop.toX, z: pot.hop.toZ } : pot
      if (Math.hypot(to.x - stood.x, to.z - stood.z) > 0.01) {
        pot.hop = { fromX: pot.x, fromZ: pot.z, toX: stood.x, toZ: stood.z, fromHeading: pot.heading, toHeading: stood.heading, t: 0 }
        pot.reach = stood.reach
        pot.over = stood.over
      }
    })
    s.cue(3.4, () => {
      stage.guestDo(who, 'wait')
      stage.guestLook(who, TRAY.saucers)
    })
    s.sound(3.4, () => cells.waitCall(kind))
  } else if (idea === 'twins') {
    // The Ducklings hold their empty cups rim to rim and look from one to the other.
    const pair = game.tea.guests.filter((guest) => guest.who.startsWith('duckling')).map((guest) => ({ who: guest.who, cup: cupOf(game.world, guest.who, placeOf(game, guest.who)) }))
    s.cue(0, () => { for (const each of pair) stage.guestDo(each.who, 'show') })
    const meets = pair.map((each) => (each.cup ? rimToRim(game, each.who, twinOf(each.who) ?? each.who, each.cup.id) : null))
    s.span(0.3, 0.6, (p) => pair.forEach((each, index) => { if (each.cup) stage.hold(each.cup.id, each.who, ease(p), 0, meets[index]) }))
    s.sound(1.0, () => cells.cupsClink(0, 0))
    s.span(1.7, 0.6, (p) => pair.forEach((each, index) => { if (each.cup) stage.hold(each.cup.id, each.who, 1 - ease(p), 0, meets[index]) }))
    s.cue(2.3, () => { for (const each of pair) if (each.cup) stage.hold(each.cup.id, null, 0, 0) })
  } else if (idea === 'sizes') {
    // The guests look the plain cups over, and each cup hops and rings at its own size.
    const plain = game.world.things.filter((thing) => thing.kind === 'cup' && thing.owner === null)
    s.cue(0, () => {
      for (const guest of game.tea.guests) {
        stage.guestDo(guest.who, 'show')
        stage.guestLook(guest.who, TRAY.cups)
      }
    })
    plain.forEach((thing, index) => {
      s.cue(0.6 + index * 0.7, () => stage.act(thing.id, 'hop'))
      s.sound(0.6 + index * 0.7, () => voices.cupRing(0, bowlOf(thing.size).rimR / 0.6))
    })
    s.cue(0.9 + plain.length * 0.7, () => { for (const guest of game.tea.guests) stage.guestLook(guest.who, null) })
  } else if (cup) {
    // The Hen bends over her cup, and the cup swells and rings twice at the pitch of her ring.
    s.cue(0, () => stage.guestLook(who, null))
    for (const at of [0.6, 1.5]) {
      s.cue(at, () => stage.act(cup.id, 'glint'))
      s.sound(at, () => voices.cupRing(cup.ring === null ? 0 : fillLevel(bowlOf(cup.size), cup.ring), 1))
    }
    s.cue(2.4, () => undefined)
  }
  return s.beats
}

/**
 * The ending: every guest has drunk a cup to its taste. They lean in and
 * clink, each cup sounding at the pitch of how full the child made it, and
 * each settles in its own way. Then the next party comes to the gate. The
 * rules have already moved the position and laid that party out.
 */
export function clink(cast: Cast): Beat[] {
  const { game, stage } = cast
  const s = script(cast)
  const guests = game.tea.guests.map((guest) => ({ who: guest.who, cup: cupOf(game.world, guest.who, placeOf(game, guest.who)) }))
  for (const guest of guests) {
    stage.guestDo(guest.who, 'clink')
    stage.guestLook(guest.who, { x: 0, z: 0.3 })
  }
  s.span(0.3, 0.7, (p) => { for (const guest of guests) if (guest.cup) stage.hold(guest.cup.id, guest.who, 0.55 * ease(p), 0) })
  guests.forEach((guest, index) => {
    const other = guests[(index + 1) % guests.length]
    if (index < Math.max(1, guests.length - 1)) s.sound(1.05 + index * 0.07, () => cells.cupsClink(cast.lastHad[guest.who] ?? likes(guest.who), cast.lastHad[other.who] ?? likes(other.who)))
  })
  // They drink together: every cup goes from the clink up to its guest's mouth, tips, and comes down again.
  s.span(1.5, 0.5, (p) => { for (const guest of guests) if (guest.cup) stage.hold(guest.cup.id, guest.who, 0.55 + 0.45 * ease(p), 0) })
  guests.forEach((guest, index) => s.sound(2.0 + index * 0.06, () => cells.sipCall(voiceKindOf(guest.who))))
  s.span(2.0, 1.2, (p) => { for (const guest of guests) if (guest.cup) stage.hold(guest.cup.id, guest.who, 1, 0.8 * Math.sin(Math.min(1, p * 1.2) * Math.PI * 0.5)) })
  s.span(3.2, 0.5, (p) => { for (const guest of guests) if (guest.cup) stage.hold(guest.cup.id, guest.who, 1 - ease(p), 0) })
  s.cue(3.7, () => { for (const guest of guests) if (guest.cup) stage.hold(guest.cup.id, null, 0, 0) })
  guests.forEach((guest, index) => {
    s.cue(4.0 + index * 0.25, () => {
      stage.guestDo(guest.who, 'settle')
      stage.guestLook(guest.who, null)
    })
    s.sound(4.0 + index * 0.25, () => cells.settleCall(voiceKindOf(guest.who)))
  })
  // The next party comes to the gate, and waits there for the child's touch.
  s.cue(5.2, () => cast.showTable(false))
  return s.beats
}

/**
 * The child touched the gate. The rules seat the waiting party as the scene
 * is built; the stage then shows the old guests going and the new ones
 * coming in.
 */
export function changeParty(cast: Cast): Beat[] {
  const { game, stage } = cast
  if (!game.tea.finished || !game.tea.waiting) return []
  // Each guest that goes takes the cup it drank from.
  const leaving = game.tea.guests.map((guest) => ({ who: guest.who, cup: cupOf(game.world, guest.who, placeOf(game, guest.who))?.id ?? null }))
  const lays = game.tea.waiting.laysOwnPlace
  // What the party leaves on the table goes back to the tray, one thing after another.
  const cleared = game.world.things.filter((thing) => (thing.kind === 'saucer' || thing.kind === 'spoon') && thing.z < 2).length
  if (!nextSitting(game)) return []
  // The pot stands where it stood until the table is clear, and only then hops to the new party's first cup: it
  // never comes down on a thing that has not left yet.
  if (game.pot.hop && cleared > 0) game.pot.hop.wait = SENT_FIRST + SENT_EVERY * cleared + 0.3
  const s = script(cast)
  // The old party goes off along its row to the right; the new one comes in from the gate on the left, so nobody meets anybody.
  for (const guest of leaving) stage.guestLeave(guest.who, guest.cup)
  s.sound(0.0, () => cells.gateBell)
  leaving.forEach((guest, index) => s.sound(0.2 + index * 0.16, () => cells.footstep(voiceKindOf(guest.who), index)))
  s.cue(1.3, () => {
    cast.showTable(false)
    // A guest that lays its own place brings its saucer and its spoon in with it from the gate, its cup held high.
    if (lays) for (const thing of game.world.things) if ((thing.kind === 'saucer' || thing.kind === 'spoon') && thing.z < 2) stage.act(thing.id, 'arrive')
  })
  game.tea.guests.forEach((guest, index) => s.sound(1.6 + index * 0.2, () => cells.footstep(voiceKindOf(guest.who), index + 3)))
  if (lays) {
    s.cue(3.7, () => { for (const guest of game.tea.guests) stage.guestDo(guest.who, 'reach') })
    s.sound(3.9, () => cells.stackClap)
    s.sound(4.05, () => cells.restClick)
  }
  // The scene lasts until everyone is in its seat: the one for the farthest seat has the longest way. A new idea is
  // shown the moment it is over (play.ts), and is marked only then, so a touch or a put-away during the walk-in
  // does not lose it.
  const seated = 1.3 + (Math.max(...game.tea.guests.map((guest) => placeOf(game, guest.who).x)) + 6.9) / 3.4 + 0.6 * (game.tea.guests.length - 1) + 0.3
  s.cue(Math.max(lays ? 4.2 : 3.0, seated), () => undefined)
  return s.beats
}
