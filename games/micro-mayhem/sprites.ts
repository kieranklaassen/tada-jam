import type { RoomId } from './house'
import { MeasurePen, type Box, type Picture } from './pen'
import { ROOM } from './rooms'
import { HANDS, stairGhosts, stairSegments } from './stairs'

// Every segment of the display, room by room, by the name a frame lights it
// with. A segment is drawn once as a dark sprite; a frame only chooses which
// are on. Only the room on the glass has its sprites made: its own segments,
// the stairwell's, and what is seen through its three doors.

const segments = new Map<RoomId, Readonly<Record<string, Picture>>>()

/** The segments of `room`: its own, and the stairwell's with the three corners its doors show. */
export function segmentsOf(room: RoomId): Readonly<Record<string, Picture>> {
  let all = segments.get(room)
  if (!all) segments.set(room, (all = { ...ROOM[room].segments, ...stairSegments(room) }))
  return all
}

/**
 * The segments of `room` whose unlit ghosts show faintly on the glass, as on a real display: one for each place
 * a figure can be, and not every pose, since a display has one segment where two poses would lie on each other.
 */
export function ghostsOf(room: RoomId): readonly string[] {
  return [...ROOM[room].ghosts, ...stairGhosts(room)]
}

function measure(picture: Picture, name: string, margin: number): Box {
  const pen = new MeasurePen()
  picture(pen)
  const box = pen.box
  if (!box) throw new Error(`segment ${name} draws nothing`)
  return { x: Math.floor(box.x - margin), y: Math.floor(box.y - margin), w: Math.ceil(box.w + margin * 2) + 1, h: Math.ceil(box.h + margin * 2) + 1 }
}

const boxes = new Map<string, Box>()

/** The box a segment's ink lies in, in stage units, with a little room round it. */
export function boxOf(room: RoomId, name: string, margin = 3): Box {
  const key = `${room} ${name} ${margin}`
  let box = boxes.get(key)
  if (!box) {
    const picture = segmentsOf(room)[name]
    if (!picture) throw new Error(`the ${room} has no segment ${name}`)
    boxes.set(key, (box = measure(picture, name, margin)))
  }
  return box
}

/** The box of one of the ghost hand's sprites, about its fingertip. */
export function handBox(name: string): Box {
  return measure(HANDS[name], name, 3)
}
