import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'
import type { Play } from './play'
import { patchCentre } from './silhouette'
import { GRID_H, GRID_W, WORK, allShiny, cellAt, type Tool } from './surface'

// What the idle ladder shows in this game: a glow on the tools that can be taken,
// then a ghost hand making one move. One move only: a touch on the vehicle,
// a rub where the tool in hand can work, or a touch on the vehicle at the
// door. The hand never goes to a tool: a child who copies it is left holding
// nothing the game chose, so the order of a wash is never shown. When the
// child has a tool in hand, the hand holds a pale copy of that same tool as
// it shows its move on the vehicle.
// Pure: the template's ladder gives the timing, the view draws the result.

export type Hint = {
  /** 0..1: how strongly the touchable things glow. */
  glow: number
  /** The tools on the rack: everything else that answers a touch is a vehicle, and a vehicle is alive already. */
  tools: Tool[]
  /** The ghost hand's fingertip in the world, or null when no move is being shown. */
  /** `holding` is the tool the hand holds as it shows its move: the one the child has in hand, and never another. */
  hand: { x: number; y: number; z: number; press: number; opacity: number; holding: Tool | null } | null
}

const pose: HandPose = { travel: 0, press: 0, opacity: 0 }

/** A run of patches along a row that `tool` has work on: where a rub of it would do something. */
function workRow(play: Play, tool: Tool): { from: [number, number]; to: [number, number] } | null {
  let best: { row: number; start: number; length: number } | null = null
  for (let row = GRID_H - 1; row >= 0; row--) {
    let start = -1
    for (let col = 0; col <= GRID_W; col++) {
      const has = col < GRID_W && WORK[tool].includes(play.bay.surface[cellAt(col, row)])
      if (has && start < 0) start = col
      if (!has && start >= 0) {
        if (!best || col - start > best.length) best = { row, start, length: col - start }
        start = -1
      }
    }
  }
  if (!best) return null
  const end = Math.min(best.start + best.length - 1, best.start + 3)
  return { from: [best.start, best.row], to: [end, best.row] }
}

/** The middle of the vehicle's side: a patch of body near the middle of its grid. */
function bodyMiddle(play: Play): { x: number; y: number } {
  const col = Math.floor(GRID_W / 2)
  for (const row of [3, 2, 4, 1, 5]) if (play.bay.surface[cellAt(col, row)] !== '.') return patchCentre(play.bay.def, col, row)
  return patchCentre(play.bay.def, col, 2)
}

/** What to show an idle child. `out` is filled in and returned, so nothing is made each frame. */
export function hintFor(play: Play, guidance: Guidance, out: Hint): Hint {
  out.glow = guidance.glow
  out.tools.length = 0
  out.hand = null
  if (guidance.glow <= 0 && guidance.demo === null) return out
  const shiny = allShiny(play.bay.surface)
  // The tools on the rack glow.
  for (const tool of ['sponge', 'hose', 'cloth'] as const) if (play.hand !== tool) out.tools.push(tool)
  if (guidance.demo === null) return out

  const bay = play.bay.motion
  const rub = play.hand !== 'finger' ? workRow(play, play.hand) : null
  if (shiny) {
    // The wash is done: the hand shows that the vehicle at the door can be touched.
    handPose(guidance.demo, false, pose)
    const next = play.next
    out.hand = { x: next.motion.homeX + next.def.side.x0 + 0.7, y: 1.3, z: next.motion.homeZ + 1.05, press: pose.press, opacity: pose.opacity, holding: null }
  } else if (rub) {
    // A tool is in hand and has work: the hand shows one short rub where it would do something.
    handPose(guidance.demo, true, pose)
    const a = patchCentre(play.bay.def, rub.from[0], rub.from[1]), b = patchCentre(play.bay.def, rub.to[0], rub.to[1])
    // The hand holds what it shows: the tool the child has in hand. A small child copies a hand with a sponge in it more readily than a bare one.
    out.hand = { x: bay.homeX + a.x + (b.x - a.x) * pose.travel, y: a.y + (b.y - a.y) * pose.travel, z: bay.homeZ + 1.05, press: pose.press, opacity: pose.opacity, holding: play.hand === 'finger' ? null : play.hand }
  } else {
    // Nothing in hand, or a tool with no work: the hand shows a touch on the vehicle itself, which always answers.
    // It never goes to a tool. The tools glow, all alike, and which one a wash takes next is the child's to remember.
    handPose(guidance.demo, false, pose)
    const at = bodyMiddle(play)
    out.hand = { x: bay.homeX + at.x, y: at.y, z: bay.homeZ + 1.05, press: pose.press, opacity: pose.opacity, holding: play.hand === 'finger' ? null : play.hand }
  }
  return out
}

export function emptyHint(): Hint {
  return { glow: 0, tools: [], hand: null }
}
