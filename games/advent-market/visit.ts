import type { Fair, Point } from './fair'
import type { ForgivingTouch, Gesture } from './input'
import { inCorner } from './overlay'
import type { Sound } from './voices'

// What the Mount does around the fair, kept apart from the Mount so that it
// can be tested without a browser: which touches are the game's, when the
// idle ladder is held at the bottom, how the fair's sounds reach the audio,
// and what a put-away does.

/** What of the audio the fair's sounds need. */
export type Speaker = {
  play(sounds: Sound[], scene: boolean): void
  /** Cuts what still rings of a scene. */
  endScene(): void
  /** Cuts everything that still rings. */
  hush(): void
}

/** Which touches are the game's. A touch that lands in the grown-up's corner is not: nothing of it reaches the fair, and it is no touch to the idle ladder. */
export class Touches {
  private cornered = false

  /** A finger lands at (x, y) on a surface `width` wide, in the surface's own pixels. Says whether the game answers it. */
  down(x: number, y: number, width: number): boolean {
    this.cornered = inCorner(x, y, width)
    return !this.cornered
  }

  /** Whether the touch in progress is the game's. */
  get mine(): boolean {
    return !this.cornered
  }

  /** The finger is up, or the touch was taken away. */
  over(): void {
    this.cornered = false
  }
}

/**
 * Whether the idle ladder is held at the bottom this frame: while a finger of the game's is down, and while a
 * scene plays. Nothing else holds it there. What a fair-goer does by itself is not the child's doing.
 */
export function busy(fingerDown: boolean, mine: boolean, playing: boolean): boolean {
  return (fingerDown && mine) || playing
}

/** Plays what the fair queued: the scene that a touch ended is cut first, then what the touch set off is heard, a scene's own sounds into the scene's gain. */
export function hear(fair: Fair, speaker: Speaker): void {
  if (fair.takeCut()) speaker.endScene()
  const sounds = fair.takeSounds()
  if (sounds.length === 0) return
  const plain = sounds.filter((sound) => !sound.scene), scene = sounds.filter((sound) => sound.scene)
  if (plain.length) speaker.play(plain, false)
  if (scene.length) speaker.play(scene, true)
}

/**
 * The game is put away, or the tab hidden. A touch under a finger that is still down is taken back; a thing the
 * child had already let go, still hanging in its grace, lands where it was let go (`park` in fair.ts). The scene
 * lands unheard, every sound is closed, and the fair stands as a load of its save would find it. The idle ladder
 * goes back to the bottom, so the hand does not come up the moment the child is back. Says whether the put-away
 * changed what a save keeps.
 */
export function putAway(fair: Fair, speaker: Speaker, ladder: { touch(now: number): void }, seconds: number): boolean {
  fair.park()
  fair.takeSounds()
  fair.takeCut()
  speaker.hush()
  ladder.touch(seconds)
  // A thing let go just before the put-away has landed where the child let it go: that is a change to save.
  return fair.takeChange() !== 0
}

/** How long a contact must have stayed where it is, in ms, before it counts as resting. */
export const REST_MS = 1000

/**
 * A resting contact never deadens the game. Called as a new contact lands, before the tracker hears of it: when the
 * working contact landed where nothing is, or has been down a second without moving, its touch ends here as one
 * taken away (no tap, no drop), and the contact that lands is then the working one. A finger that holds the
 * dipping stick, a thing or the basket is never interrupted, however still it is: holding still is dipping and
 * carrying. A finger that rubs, pipes or folds is moving or lifts within the second, and is not interrupted
 * either. `mine` is whether the touch in progress is the game's: a hold in the grown-up's corner is left alone.
 * Returns the gestures that end the resting contact, for `handle`.
 */
export function handOver(fair: Fair | null, touch: ForgivingTouch, mine: boolean, t: number): Gesture[] {
  if (!fair || !mine || !touch.active || fair.carrying) return []
  // A drag that is waiting out a lift is not a contact at rest: the tracker ends or carries it on by itself.
  if (!fair.bare && touch.restedFor(t) < REST_MS) return []
  return touch.clear()
}

/**
 * What each gesture of the touch does to the fair. The points are in the surface's own pixels, and `toStage`
 * turns each into stage units. A tap and the end of a drag are the child letting go; a press that ends without a
 * tap and a drag the browser took away are not, and make no move. The fair keeps a carried thing hanging for a
 * moment after the lift, so a finger that skipped carries on.
 */
export function handle(fair: Fair, gestures: readonly Gesture[], toStage: (at: Point) => Point): void {
  for (const gesture of gestures) {
    switch (gesture.type) {
      case 'press': {
        const p = toStage(gesture.at)
        fair.press(p.x, p.y)
        break
      }
      case 'dragStart':
        break
      case 'dragMove':
      case 'dragLift': {
        const p = toStage(gesture.at)
        fair.move(p.x, p.y)
        break
      }
      case 'tap':
      case 'dragEnd':
        fair.release(true)
        break
      case 'pressEnd':
      case 'dragCancel':
        fair.release(false)
        break
      default:
        // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
        gesture satisfies never
    }
  }
}
