import type { Camera } from './camera'
import type { ForgivingTouch, Gesture, Point } from './input'
import { beachEnd, cloudRanges, groundPoint, homeControlBox, skyHalfWidth, sunShift, targetAt } from './layout'
import { inCorner } from './overlay'
import type { Play } from './play'

// What the game does with a gesture, with no browser in it: the Mount hands
// every touch here, and a test can play the game through the same door a
// finger uses.

/**
 * Whether a press at a point of the surface is the game's to answer. The grown-up's corner at the top right is
 * not, and neither is the box the home control takes with the room kept round it: nothing there makes a sound,
 * moves, or counts as the child playing.
 */
export function answers(camera: Camera, x: number, y: number): boolean {
  if (inCorner(x, y, camera.width)) return false
  const home = homeControlBox(camera)
  return !(x >= home.left && x <= home.right && y >= home.top && y <= home.bottom)
}

/**
 * Tells the game what its surface shows: how wide the sky is and how far along it each cloud may go, clear of
 * the home control and the grown-up's corner, and how far up the beach the bottom edge is, for the long wave that runs over the whole of it. Every game the Mount makes
 * (loaded, or found again after a rest) is told the same.
 */
export function frameFor(game: Play, camera: Camera): void {
  game.skyHalf = skyHalfWidth(camera)
  game.skyRanges = cloudRanges(camera)
  game.beachEnd = beachEnd(camera)
}

/**
 * The game as it comes back from a rest: the one a load of what was just saved would make, told its surface as
 * a loaded game is. Parked is loaded, so nothing goes on behind the child's back.
 */
export function rested(game: Play, camera: Camera | null, seed: number): Play {
  const found = game.parked(seed)
  if (camera) frameFor(found, camera)
  return found
}

/**
 * The answer starts on the press, when the finger lands, never on the lift. A touch first ends a scene that is
 * playing, and is then an ordinary touch. A stroke has no drop: whatever ends it, what was dug stays dug. A thing
 * in the hand (the bucket, a shell, a piece of wood, the sun) is let go where the finger lifts, and goes back
 * where it came from when the touch is taken away.
 */
export function act(game: Play, camera: Camera, gestures: readonly Gesture[]): void {
  for (const gesture of gestures) {
    switch (gesture.type) {
      case 'press':
        if (!answers(camera, gesture.at.x, gesture.at.y)) break
        game.endScene()
        game.press(targetAt(camera, gesture.at.x, gesture.at.y, game.field, game.folk.spots((x, z) => game.ground(x, z)), game.sea, game.drawn(), game.cloudXs()))
        break
      case 'dragStart':
        game.dragStart()
        break
      case 'dragMove': {
        // A drag begun on a rock, the log, a cloud, the sky or one of the folk digs from where it comes onto the sand.
        if (game.passing && answers(camera, gesture.at.x, gesture.at.y)) {
          game.comeOnto(targetAt(camera, gesture.at.x, gesture.at.y, game.field, game.folk.spots((x, z) => game.ground(x, z)), game.sea, game.drawn(), game.cloudXs()))
          break
        }
        const ground = groundPoint(camera, gesture.at.x, gesture.at.y, game.field, game.sea)
        game.drag(ground ? ground.x : null, ground ? ground.z : null, sunShift(camera, gesture.at.y - gesture.from.y))
        break
      }
      case 'dragLift':
        game.lift()
        break
      case 'tap':
        game.tap()
        break
      case 'dragEnd':
        game.release()
        break
      // The touch was taken away: the child made no drop.
      case 'pressEnd':
      case 'dragCancel':
        game.cancel()
        break
      default:
        // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
        gesture satisfies never
    }
  }
}

/**
 * The finger lifts. With a thing in the hand the lift is the act: it is set down, a bridge is laid and the sun
 * let go in the frame the finger leaves the glass, and the drag does not wait for the finger to come back. A
 * groove has no drop, so a stroke keeps its grace: a finger that comes back near where it lifted carries on.
 * Only a stroke does: a drag that has nothing left under it (the bucket knocked out of the hand, a drag begun on
 * one of the folk that never came onto the sand) ends at the lift too, so the next finger down is a press and is
 * answered as one.
 */
export function lifted(game: Play, touch: ForgivingTouch, id: number, at: Point, time: number): Gesture[] {
  const gestures = touch.up(id, at, time)
  return game.digging ? gestures : [...gestures, ...touch.letGo()]
}
