import { putInSand, standsAt, type Arrangement } from './arrangement'
import { CHUCKLE_ROCK, delight, type Reaction } from './cells'
import type { Playground } from './motion'
import { NESTLE } from './rest'
import { askerEnd, type Ride } from './rides'
import type { Beat } from './scene'
import { chirp, crow, type Part } from './voices'
import { FRIENDS, PLANK, SAND, homeOn, otherEnd, seatX, type FriendId } from './world'

// The short scenes, as lists of timed beats for scene.ts: the ending of a
// ride, and the one showing of each kind of ride. No renderer. A scene's
// outcome is already in the world, and on its way to storage, before its
// first beat (game.ts), so a beat only moves bodies and makes sound. A touch
// ends a scene with every beat at its end: a beat that is cut does nothing,
// and the game then stands everyone where the saved world has them.

/**
 * What a scene needs of whoever plays it. The game is one such; so is the
 * silent twin that plays a scene ahead of time, to learn what it will do to
 * the sand before the scene starts.
 */
export type Director = {
  play: Playground
  /** A touch ended the scene: its beats do nothing more. */
  cut: boolean
  /** The saved world's arrangement: where everyone is when the scene is over. */
  ends: Arrangement
  react(reactions: readonly Reaction[]): void
  voice(parts: readonly Part[]): void
  nextSaid(): number
  expectLanding(before: Arrangement, id: FriendId): void
}

/** How hard the plank is pushed for each of the three rocks of an ending, radians a second. */
export const ROCK = 1.6
/** When the three rocks fall, in seconds from the start of the ending. */
export const ROCKS_AT = [1.8, 2.6, 3.4] as const
/** When the friend who asks next leaves for the waiting place: the last beat of an ending. */
export const NEXT_AT = 4.8

/** Something that happens once at `at`, unless a touch has ended the scene. */
function once(game: Director, at: number, what: () => void): Beat {
  return { at, lasts: 0, play: () => { if (!game.cut) what() } }
}

/** A beat that only marks where the scene ends. */
function until(at: number): Beat {
  return { at, lasts: 0, play: () => {} }
}

/**
 * The ride, the ending of every cycle: the asker's own delight, the friends
 * who lifted it bouncing one after another in their stack order, three rocks
 * of the plank whose reach comes from the weights as they stand, and then the
 * friend who asks next leaving for the waiting place.
 */
export function endingBeats(game: Director, asker: FriendId, lifters: readonly FriendId[]): Beat[] {
  const beats: Beat[] = [once(game, 0, () => game.react(delight(asker)))]
  // Bo's chuckle shakes the plank under him.
  if (asker === 'bo') for (const [at, way] of [[0.15, 1], [0.35, -1], [0.55, 1], [0.75, -1]] as const) beats.push(once(game, at, () => game.play.rock(way * CHUCKLE_ROCK)))
  lifters.forEach((id, index) => {
    beats.push(once(game, 0.8 + index * 0.22, () => {
      game.play.act(id, 'bounce', 0.5)
      game.voice(chirp(id, game.nextSaid()))
    }))
  })
  for (const at of ROCKS_AT) {
    beats.push(once(game, at, () => {
      // Against the way it lies: the heavy end lifts as far as the difference lets it, and comes back.
      const way = Math.sign(game.play.plank.tilt)
      if (way !== 0) game.play.rock(-way * ROCK)
    }))
  }
  // This beat lands whether or not the scene is cut: the next asker goes to wait, and the plank answers its leaving.
  beats.push({ at: NEXT_AT, lasts: 0, play: () => game.play.relayout(game.ends) })
  return beats
}

/** The one showing of a kind of ride: a friend does the new thing once, with no word, and never the answer to this ride. */
export function showingBeats(game: Director, ride: Ride): Beat[] {
  const play = game.play, near = askerEnd(ride), far = otherEnd(near), side = near === 'left' ? -1 : 1
  switch (ride.kind) {
    case 'little-asks':
      // Pim, standing by the plank, hops onto her end herself; it thumps down; she looks up at the high end and across at the others.
      return [
        once(game, 0, () => {
          play.standAt('pim', { x: seatX(near), y: 0, z: PLANK.z + SAND.plankStrip + 0.2 })
          play.plank.tilt = 0
          play.plank.spin = 0
        }),
        once(game, 0.5, () => {
          const before = putInSand(play.arrangement, 'pim', homeOn('pim', near))
          play.goHome('pim')
          game.expectLanding(before, 'pim')
        }),
        once(game, 1.7, () => play.look('pim', -side * 0.9, 0.9)),
        once(game, 2.3, () => play.look('pim', -side * 0.9, 0)),
        until(2.8),
      ]
    case 'middle-asks':
      // Pim hops onto the far end, dangles and kicks, and hops off again.
      return [
        once(game, 0.4, () => {
          const before = play.arrangement
          play.tapFriend('pim')
          game.expectLanding(before, 'pim')
        }),
        once(game, 2.0, () => play.tapFriend('pim')),
        until(2.9),
      ]
    case 'big-asks':
      // In the sand, Pim hops onto Mog's head and off again.
      return [
        once(game, 0.4, () => {
          const mog = standsAt(play.arrangement, 'mog')
          play.visit('pim', { x: mog.x, y: FRIENDS.mog.halfHeight * 2 * NESTLE, z: mog.z })
        }),
        once(game, 1.05, () => game.react([{ who: 'pim', after: 0, voice: crow(), act: 'bounce', seconds: 0.6 }, { who: 'mog', after: 0.05, act: 'duck', seconds: 0.5 }])),
        once(game, 1.9, () => play.goHome('pim')),
        until(2.8),
      ]
    case 'near-side': {
      // Bo leans toward Pim's end; she looks up at him and ducks.
      const bo = standsAt(play.arrangement, 'bo'), toward = Math.sign(seatX(near) - bo.x) || -side
      return [
        once(game, 0.3, () => {
          play.act('bo', 'lean', 1.7, toward)
          game.voice(chirp('bo', game.nextSaid()))
        }),
        once(game, 0.8, () => {
          play.act('pim', 'duck', 1.2)
          play.look('pim', -toward, 0.9)
          game.voice(chirp('pim', game.nextSaid()))
        }),
        until(2.4),
      ]
    }
    case 'high-asks':
      // Bo hops on and the plank tosses Pim up to where she sits.
      return [
        once(game, 0, () => play.settleTo(putInSand(game.ends, 'bo', homeOn('bo', far)))),
        once(game, 0.5, () => {
          const before = play.arrangement
          play.tapFriend('bo')
          game.expectLanding(before, 'bo')
        }),
        until(3.2),
      ]
  }
}
