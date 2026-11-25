import { GROUND, HANG, RIGHT, pegAt } from './layout'
import { CHEER_S, type Play } from './play'
import type { Beat } from './round'

// The farmer wishes for a horse. The hand leads the horse to him, the yard is
// beside itself, he wishes for a hen, and the hand fetches its head off the line.

export function openingBeats(play: Play): Beat[] {
  const front = () => ({ x: play.halves[0].x, y: GROUND - play.halves[0].y - 190 })
  return [
    { wait: 1.6, from: front, to: () => ({ x: RIGHT - 20, y: front().y }), carry: 1.5 },
    { wait: 1.3, ready: () => play.wish === 1 && play.cheer >= CHEER_S, from: () => { const at = pegAt(play.pegs.indexOf(1)); return { x: at.x, y: at.y + HANG } } },
  ]
}
