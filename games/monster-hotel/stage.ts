import type { Arrangement } from './arrangement'
import type { Pairing } from './cycle'
import type { GuestId, Phase } from './guests'
import type { Beat } from './scene'

// The short scenes as lists of timed beats (scene.ts), and the stage they
// play on. A scene's outcome is already in the saved stay when it starts, so
// everything here is a view: the hour that goes by, the porter's other
// arrangement, guests filing out to the coach. Every beat leaves the stage
// where it was taking it, so a touch that ends a scene finds the house as the
// stay has it, with nothing left hanging. No renderer, no DOM, no clock.

export type Point = { x: number; y: number }

/** One straight stretch of a walk. */
export type Leg = { from: Point; to: Point }

/**
 * One guest walking, by doors and never through a wall: each leg is a
 * straight stretch it is seen on, and between two legs it has gone through a
 * door and come out of another. Before `progress` reaches 0 it has not set
 * out; at 1 it has arrived.
 */
export type Walk = { id: GuestId; legs: Leg[]; progress: number }

/** Where a walking guest is, or null while it has not set out, has arrived, or is behind a door. Legs take time by their length. */
export function whereOn(walk: { legs: Leg[]; progress: number; id?: GuestId }): Point | null {
  if (walk.progress <= 0 || walk.progress >= 1 || walk.legs.length === 0) return null
  const lengths = walk.legs.map((leg) => Math.max(1e-6, Math.hypot(leg.to.x - leg.from.x, leg.to.y - leg.from.y)))
  const whole = lengths.reduce((sum, length) => sum + length, 0)
  let gone = walk.progress * whole
  for (let i = 0; i < walk.legs.length; i++) {
    if (gone <= lengths[i] || i === walk.legs.length - 1) {
      const t = Math.min(1, gone / lengths[i]), leg = walk.legs[i]
      return { x: leg.from.x + (leg.to.x - leg.from.x) * t, y: leg.from.y + (leg.to.y - leg.from.y) * t }
    }
    gone -= lengths[i]
  }
  return null
}

export type Stage = {
  /** The hour a scene is showing, when it is not the hour the child left: a view, never saved. */
  hour: Phase | null
  /** The house a scene is showing, when it is not the child's: the porter's neat way. */
  house: Arrangement | null
  /** Guests who have left the house and are filing out to the coach. They are in no saved field. */
  leaving: Walk[]
  /** Guests of the new coach-load walking in from the coach to their places in the lobby. */
  arriving: Walk[]
  /** Where the coach stands, in coach lengths from its place at the kerb, and whether its door is open. */
  coachAt: number
  coachOpen: boolean
  /** How far the porter has trundled, 0 to 1, and how far that is and which way, in the drawing's units: toward the house wall (below zero) or out into the lobby. */
  porter: number
  reach: number
  /** A pairing in the middle of its absurd thing, and how far through it is. */
  pair: { kind: Pairing; progress: number } | null
}

export function restStage(): Stage {
  return { hour: null, house: null, leaving: [], arriving: [], coachAt: 0, coachOpen: false, porter: 0, reach: 0, pair: null }
}

/** What a scene asks of the game as it plays: sounds, sweeps and the one mark a scene saves late. */
export type Hooks = {
  /** True while a touch (or a put-away) is ending the scene and its beats are being landed all at once. Nothing sounds then, and the porter has not come in. */
  landing(): boolean
  /** The page shows another hour, or goes back to the child's (null). */
  hour(to: Phase | null): void
  /** The house shown changes: guests walk to their new places. */
  houseChanges(): void
  /** The porter comes in: the one thing a scene saves after its start. */
  porterComesIn(): void
  /** A named moment with a sound of its own. */
  cue(name: 'door-opens' | 'door-shuts' | 'coach-leaves' | 'coach-arrives' | 'porter-trundles' | 'porter-shows' | 'porter-goes' | 'porter-fetches' | Pairing): void
}

const ease = (t: number) => t * t * (3 - 2 * t)
/** A cue that just happens. */
const moment = (at: number, play: () => void): Beat => ({ at, lasts: 0, play })
/** A sound of a moment, unless the scene is being landed by a touch. */
const say = (hooks: Hooks, name: Parameters<Hooks['cue']>[0]) => { if (!hooks.landing()) hooks.cue(name) }

// --- The settled day -----------------------------------------------------------

export const SETTLED = { hold: 1, each: 3.6 } as const

/**
 * The settled day, the ending: one hour of each kind goes by. The page holds
 * the child's hour for a moment, shows the other for a while with everyone at
 * their own thing, and comes back to rest where the child had left the wheel.
 */
export function settledDay(stage: Stage, childHour: Phase, hooks: Hooks): Beat[] {
  const other: Phase = childHour === 'day' ? 'night' : 'day'
  return [
    moment(SETTLED.hold, () => {
      if (hooks.landing()) return
      // Asked for before it is set, so that the page sweeps from the hour it was showing.
      hooks.hour(other)
      stage.hour = other
    }),
    moment(SETTLED.hold + SETTLED.each, () => {
      // Back to the hour the child left: also where a touch that ends the scene lands, at once and in silence.
      if (stage.hour !== null && !hooks.landing()) hooks.hour(null)
      stage.hour = null
    }),
    // The child's own hour, held: the house breathing as it was arranged.
    { at: SETTLED.hold + SETTLED.each, lasts: SETTLED.each + 0.3, play: () => {} },
  ]
}

// --- The porter's neat way -------------------------------------------------------

export const NEAT = { in: 1.2, move: 1, hold: 2.6, out: 1.2 } as const
/** How far out of his corner into the lobby the porter trundles to show his way. The lobby is empty then: the house is settled. */
export const NEAT_REACH = 56

/**
 * The porter's neat way: he trundles in, the house is shown arranged the
 * cast's neat way, it holds, and he puts everything back exactly as the child
 * had it. The mark that it has been shown is made when he comes in, and only
 * if the scene has got that far by itself. With `hour`, his way is shown at
 * that hour and the page comes back to the child's when he puts things back.
 */
export function neatWay(stage: Stage, neat: Arrangement, hooks: Hooks, hour: Phase | null = null): Beat[] {
  let trundling = false
  const back = NEAT.in + NEAT.move + NEAT.hold
  return [
    {
      at: 0,
      lasts: NEAT.in,
      play: (progress) => {
        if (hooks.landing()) return
        if (!trundling) {
          trundling = true
          stage.reach = NEAT_REACH
          hooks.cue('porter-trundles')
        }
        stage.porter = ease(progress)
      },
    },
    moment(NEAT.in, () => {
      // A touch that ends the scene before this moment lands it too, and then he has not come in: nothing is marked.
      if (hooks.landing()) return
      hooks.porterComesIn()
      stage.house = neat
      hooks.houseChanges()
      hooks.cue('porter-shows')
      // Shown at another hour than the child's, when that is the hour his way makes somebody happier: a view, like the settled day's.
      if (hour !== null) {
        hooks.hour(hour)
        stage.hour = hour
      }
    }),
    { at: NEAT.in, lasts: NEAT.move + NEAT.hold, play: () => {} },
    moment(back, () => {
      if (stage.house === null) return
      stage.house = null
      hooks.houseChanges()
      say(hooks, 'porter-goes')
      // Back to the hour the child left, at once and in silence when a touch lands the scene.
      if (stage.hour !== null && !hooks.landing()) hooks.hour(null)
      stage.hour = null
    }),
    {
      at: back + NEAT.move,
      lasts: NEAT.out,
      play: (progress) => {
        stage.porter = progress >= 1 ? 0 : 1 - ease(progress)
        if (progress >= 1) stage.reach = 0
      },
    },
  ]
}

// --- The coach -------------------------------------------------------------------

export const COACH = { file: 2.2, gap: 0.35, away: 1.1, arrive: 1.2, back: 0.95 } as const

function walking(walks: Walk[], from: number, lasts: number, stagger: number): Beat[] {
  // One after another, each setting out a little after the one before: a line, unbothered.
  return walks.map((walk, index) => ({
    at: from + index * stagger,
    lasts,
    play: (progress: number) => {
      walk.progress = progress
    },
  }))
}

/**
 * The porter fetches the things back: he rings his bell and after `call`
 * seconds they set out for his trolley, which takes them `hop`; he trundles
 * them to the foot of his ladder in `trundle`; and they go up it to their
 * places in the cupboard in `stow`.
 */
export const FETCH = { call: 0.3, hop: 1, trundle: 0.6, stow: 1.2 } as const
/** How far he trundles with the things on his trolley: the few steps to the wall of the house and back, away from whoever waits in the lobby. */
export const FETCH_REACH = -6

function porterFetches(stage: Stage, hooks: Hooks): Beat[] {
  let trundling = false
  return [
    moment(FETCH.call, () => say(hooks, 'porter-fetches')),
    {
      at: FETCH.call + FETCH.hop,
      lasts: FETCH.trundle,
      play: (progress) => {
        if (!trundling && progress < 1) { trundling = true; stage.reach = FETCH_REACH; say(hooks, 'porter-trundles') }
        // Out to the house wall and back to his ladder: where a touch that ends the scene lands him too.
        stage.porter = progress >= 1 ? 0 : Math.sin(progress * Math.PI)
        if (progress >= 1) stage.reach = 0
      },
    },
  ]
}

/** The coach pulls away and the next one pulls up, blinds drawn, and waits. */
function nextCoach(stage: Stage, at: number, hooks: Hooks): Beat[] {
  let left = false, came = false
  return [
    moment(at, () => {
      stage.coachOpen = false
      stage.leaving = []
      say(hooks, 'door-shuts')
    }),
    {
      at: at + 0.2,
      lasts: COACH.away,
      play: (progress) => {
        if (!left && progress < 1) { left = true; say(hooks, 'coach-leaves') }
        stage.coachAt = ease(progress)
      },
    },
    {
      at: at + 0.2 + COACH.away,
      lasts: COACH.arrive,
      play: (progress) => {
        if (!came && progress < 1) { came = true; say(hooks, 'coach-arrives') }
        // It comes in from the other side and stops where the last one stood.
        stage.coachAt = progress >= 1 ? 0 : -1 + ease(progress)
      },
    },
  ]
}

/**
 * The coach changes over: the door opens, the old guests file out with their
 * bags past the new ones without a glance, the porter trundles the things
 * back to the cupboard (`things`: there are some out), each new guest walks to
 * its place in the lobby, and the coach pulls away for the next to pull up.
 */
export function coachChangesOver(stage: Stage, leaving: Walk[], arriving: Walk[], hooks: Hooks, things = false): Beat[] {
  stage.leaving = leaving
  stage.arriving = arriving
  // Until it sets out, an arriving guest is still in the coach.
  for (const walk of arriving) walk.progress = -1
  // A guest who was in the old coach-load and is in the new one too is one guest: it files out with the old ones, at the head of
  // the line, and gets off again only when it has got on, a little brisker than it went. It is never on the page twice.
  const back = new Set(arriving.map((walk) => walk.id))
  leaving = [...leaving].sort((a, b) => Number(back.has(b.id)) - Number(back.has(a.id)))
  stage.leaving = leaving
  const out = walking(leaving, 0.2, COACH.file, COACH.gap)
  const boarded = new Map(leaving.map((walk, index) => [walk.id, 0.2 + index * COACH.gap + COACH.file]))
  const inn: Beat[] = arriving.map((walk, index) => {
    const got = boarded.get(walk.id)
    return { at: Math.max(0.9 + index * COACH.gap, got === undefined ? 0 : got + 0.1), lasts: got === undefined ? COACH.file : COACH.back, play: (progress: number) => { walk.progress = progress } }
  })
  const done = Math.max(0.2 + COACH.file + Math.max(0, leaving.length - 1) * COACH.gap, ...inn.map((beat) => beat.at + beat.lasts), 0.9 + COACH.file)
  return [
    moment(0, () => {
      stage.coachOpen = true
      say(hooks, 'door-opens')
    }),
    ...out,
    ...inn,
    // Meanwhile the porter trundles back to the cupboard whatever the old guests had about the house.
    ...(things ? porterFetches(stage, hooks) : []),
    moment(done, () => {
      stage.arriving = []
    }),
    ...nextCoach(stage, done + 0.1, hooks),
  ]
}

/** Sent away: the guest set down on the coach is followed out by the rest in a line, the things go back to the cupboard (`things`: there are some out), the coach pulls away, and the next pulls up and waits. */
export function sentAway(stage: Stage, leaving: Walk[], hooks: Hooks, things = false): Beat[] {
  stage.leaving = leaving
  const out = walking(leaving, 0.1, COACH.file, COACH.gap)
  const done = 0.1 + COACH.file + Math.max(0, leaving.length - 1) * COACH.gap
  return [
    moment(0, () => {
      stage.coachOpen = true
      say(hooks, 'door-opens')
    }),
    ...out,
    ...(things ? porterFetches(stage, hooks) : []),
    ...nextCoach(stage, Math.max(done, things ? FETCH.call + FETCH.hop + FETCH.trundle + FETCH.stow : 0) + 0.1, hooks),
  ]
}

// --- Pairings --------------------------------------------------------------------

export const PAIRING_SECONDS = 4

/** A pairing: the two do one absurd thing together, for about four seconds. It changes no field. */
export function pairing(stage: Stage, kind: Pairing, hooks: Hooks): Beat[] {
  let begun = false
  return [
    {
      at: 0,
      lasts: PAIRING_SECONDS,
      play: (progress) => {
        if (!begun && progress < 1) { begun = true; say(hooks, kind) }
        stage.pair = progress >= 1 ? null : { kind, progress }
      },
    },
  ]
}
