// The finger, read as the four things it can tell the fox while it is down:
// a slide of one lane's worth to a side, as often as the slide goes on, a
// quick flick up and a quick flick down. Holding still tells it nothing new:
// the Mount already knows the finger is down, and the fox runs.
//
// A slide and a flick are both quick moves. Each is measured against a point
// that trails the finger and catches it up when it stops, so a hand that
// drifts across the glass or up it under a long hold tells the fox nothing,
// and a slide that goes on changes lane again and again.
// Points are in the surface's own pixels and times in milliseconds.

export type Command = 'left' | 'right' | 'jump' | 'tuck'

/** Seconds in which the trailing point catches up with a finger that has stopped: up and down, and sideways. */
export const TRAIL_SECONDS = 0.08
export const SLIDE_SECONDS = 0.35

export type Reach = {
  /** Pixels of sideways slide that count as one lane. */
  slide: number
  /** Pixels a quick move up or down must cover to count as a flick. */
  flick: number
}

/** The two lengths for a surface: a slide is a third of the way from one lane to the next as drawn at the fox, a flick a little less than a twentieth of the surface's shorter side. */
export function reachFor(width: number, height: number, lanePixels: number): Reach {
  const short = Math.min(width, height)
  return { slide: Math.max(28, Math.min(72, lanePixels / 3)), flick: Math.max(28, short * 0.045) }
}

export class Steer {
  /** The trailing point, and where the finger itself was at its last move. */
  private x = 0
  private y = 0
  private fingerX = 0
  private fingerY = 0
  private at = 0

  /** The finger landed. */
  press(x: number, y: number, time: number): void {
    this.x = x
    this.y = y
    this.fingerX = x
    this.fingerY = y
    this.at = time
  }

  /** The finger moved. Returns what the move tells the fox, in order; most moves tell it nothing. */
  move(x: number, y: number, time: number, reach: Reach, out: Command[] = []): Command[] {
    out.length = 0
    // The trailing point first closes on where the finger was, by the time that has passed since its last move.
    const seconds = Math.max(0, time - this.at) / 1000
    this.at = time
    this.x += (this.fingerX - this.x) * (1 - Math.exp(-seconds / SLIDE_SECONDS))
    this.fingerX = x
    while (x - this.x >= reach.slide) {
      this.x += reach.slide
      out.push('right')
    }
    while (this.x - x >= reach.slide) {
      this.x -= reach.slide
      out.push('left')
    }
    this.y += (this.fingerY - this.y) * (1 - Math.exp(-seconds / TRAIL_SECONDS))
    this.fingerY = y
    const lag = y - this.y
    if (lag <= -reach.flick) {
      this.y = y
      out.push('jump')
    } else if (lag >= reach.flick) {
      this.y = y
      out.push('tuck')
    }
    return out
  }
}
