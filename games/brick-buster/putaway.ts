import { voiceOf, type GameAudio } from './audio'
import type { IdleLadder } from './guidance'
import type { Limits } from './layout'
import type { SaveCadence } from './saveCadence'
import type { Table } from './table'

// Put-away, for the parts of it that are the game's own. A game that is put away is the game its save sets up,
// and a child who comes back starts a new stretch of play: the idle time before the put-away is not theirs any
// more, so the ghost hand does not show the moment the game is opened again.

/**
 * The table as it is found again, on the surface it is shown on, with the idle ladder back at its bottom.
 * `seconds` is the attended clock, which stands still while the game rests.
 */
export function putAway(table: Table, ladder: Pick<IdleLadder, 'touch'>, seconds: number, limits: Limits): Table {
  ladder.touch(seconds)
  const found = table.settled()
  found.fitTo(limits)
  return found
}

/**
 * Hands what the table has changed since the last call to the save cadence. A change to the wall, the tray, the
 * ball or the position asks the cadence for a save now, in the frame it is made, however lately the last save was:
 * a crack is as much a change as a fall, and a put-away in the next moment must find it. Only where the bumper
 * stands, which changes with every step of a drag, waits for the throttle.
 */
export function keep(table: Pick<Table, 'dirty'>, cadence: Pick<SaveCadence, 'change'>, time: number): void {
  if (table.dirty === 'no') return
  const atOnce = table.dirty === 'now'
  table.dirty = 'no'
  cadence.change(time, atOnce)
}

/**
 * Plays what the table has set off since the last call, as one voice. A touch that ended a scene comes first: the
 * scene is silent from that frame, so whatever is still sounding is cut, and then the touch's own answer is played.
 */
export function voice(table: Pick<Table, 'hushed' | 'sounds'>, audio: Pick<GameAudio, 'hush' | 'play'>): void {
  if (table.hushed) {
    table.hushed = false
    audio.hush()
  }
  if (table.sounds.length === 0) return
  audio.play(voiceOf(table.sounds))
  table.sounds = []
}
