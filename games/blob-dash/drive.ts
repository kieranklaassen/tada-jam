import { DIAL, RELEASE, rackPoint, slotOf, slotPoint } from './layout'
import { KINDS, type Kind, type Piece } from './pieces'
import { Toy, type ToyEvent } from './toy'

// For the tests: a loop made from a few numbers, played frame by frame, and
// a finger that does what a child's does. Nothing in the game imports this.

export const FRAME = 1 / 60
/** A bare stretch of wall, where a tap is nothing but a tap. */
export const BARE = { x: 330, y: 70 } as const
export const GRIP = { x: RELEASE.x, y: RELEASE.rest } as const
export const KNOB = { x: DIAL.x + 40, y: DIAL.y } as const

export const piece = (kind: Kind, beat: number, ceiling = false): Piece => ({ kind, beat, ceiling })

export const fresh = (tempo = 120, springs: number[] = [], pieces: Piece[] = [], seed = 1): Toy => new Toy({ tempo, springs, pieces }, seed)

/** Plays frames until the loop is `beats` into the visit, and hands back every event on the way. */
export function runTo(toy: Toy, beats: number, frame = FRAME): ToyEvent[] {
  const events: ToyEvent[] = []
  while (toy.pos < beats - 1e-9) {
    const left = ((beats - toy.pos) * 60) / toy.tempo
    toy.step(Math.min(frame, left))
    events.push(...toy.take())
  }
  return events
}

export const types = (events: ToyEvent[]): string[] => events.map((event) => event.type)
export const of = <T extends ToyEvent['type']>(events: ToyEvent[], type: T): Extract<ToyEvent, { type: T }>[] => events.filter((event): event is Extract<ToyEvent, { type: T }> => event.type === type)

/** A finger takes a piece from the rack and lets it go on a beat. */
export function carry(toy: Toy, kind: Kind, beat: number, ceiling = false): void {
  const from = rackPoint(KINDS.indexOf(kind)), to = slotPoint(slotOf(beat, ceiling))
  toy.press(from)
  toy.drag(from, to)
  toy.endDrag(true)
}
