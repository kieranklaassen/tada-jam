import type { Spot } from './layout'
import { settlePose } from './pose'
import type { Beat } from './scene'
import type { Sound } from './sounds'
import type { Piece } from './thing'
import type { World } from './world'

// How a scene is written down: a list of timed beats (scene.ts) over the things it leads. A scene's outcome is
// put into the things' resting places before the first beat, so the beats only move where things are drawn and
// how they are posed. A led thing is left alone by the world's own springs until the scene's last beat hands
// it back at its resting place. A beat's sound is marked as the scene's, and a beat that lands unwatched
// because a touch ended the scene makes none.

export const smooth = (t: number): number => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u) }
export const hump = (u: number): number => Math.sin(Math.min(1, Math.max(0, u)) * Math.PI)

export class Script {
  readonly beats: Beat[] = []
  private readonly led: Piece[] = []

  constructor(readonly world: World) {}

  /** The scene takes these things: whatever each was doing is over. */
  lead(...pieces: Piece[]): void {
    for (const p of pieces) {
      if (this.led.includes(p)) continue
      p.led = true; p.flight = null; p.gen += 1; p.stir = null; p.liftV = 0; p.hopV = 0
      this.led.push(p)
    }
  }

  /** Something that happens at one moment. */
  cue(at: number, run: (finishing: boolean) => void): void {
    this.beats.push({ at, lasts: 0, play: (_progress, finishing) => run(finishing) })
  }

  /** A sound at one moment, as the scene's own. */
  say(at: number, sound: Sound): void {
    this.cue(at, (finishing) => { if (!finishing) this.world.say({ ...sound, scene: true }) })
  }

  /** Something that goes on for a stretch: `run` gets its progress, 0 to 1, and is called with 1 exactly once. */
  over(at: number, lasts: number, run: (u: number, finishing: boolean) => void): void {
    this.beats.push({ at, lasts, play: run })
  }

  /** Moves a thing's drawn foot from where it is when the beat begins to a point, in an arc `arc` high, with `bobs` small hops on the way. */
  go(p: Piece, at: number, lasts: number, to: Spot, arc = 0, bobs = 0): void {
    let from: Spot | null = null, lift = 0
    this.over(at, lasts, (u) => {
      if (!from) { from = { x: p.px, y: p.py }; lift = p.lift }
      const e = smooth(u)
      p.px = from.x + (to.x - from.x) * e
      p.py = from.y + (to.y - from.y) * e
      p.lift = lift * (1 - e) + arc * 4 * u * (1 - u)
      p.hop = bobs > 0 ? 9 * Math.abs(Math.sin(u * Math.PI * bobs)) : 0
    })
  }

  /** Moves a thing to where it rests: for a thing that rests on another, onto its seat. */
  seat(p: Piece, at: number, lasts: number, arc = 40): void {
    this.go(p, at, lasts, { x: p.x, y: p.y }, arc)
  }

  /** The last beat: every led thing is handed back where it rests, posed as its place calls for. */
  end(at: number): Beat[] {
    this.cue(at, () => {
      for (const p of this.led) {
        p.px = p.x; p.py = p.y; p.lift = 0; p.liftV = 0; p.hop = 0; p.hopV = 0; p.far = p.at === 'basket' ? 1 : 0
        settlePose(this.world.pieces, p)
      }
      this.world.tip = this.world.basket === 'tipped' ? 1 : 0
    })
    // In the order of their moments: a touch lands whatever is left in that order, the last beat last.
    return this.beats.map((beat, index) => ({ beat, index })).sort((a, b) => a.beat.at - b.beat.at || a.index - b.index).map((each) => each.beat)
  }
}
